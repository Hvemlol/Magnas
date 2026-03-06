using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Platform.Api.Data;
using Platform.Api.DTOs;
using Platform.Api.Models;

namespace Platform.Api.Services;

public interface IElementService
{
    Task<List<ElementSummaryDto>>               ListAsync(int userId);
    Task<ServiceResult<ElementDetailDto>>       GetByIdAsync(int userId, int elementId);
    Task<ElementSummaryDto>                     CreateAsync(int userId, ElementRequest req);
    Task<ServiceResult<ElementSummaryDto>>      UpdateAsync(int userId, int elementId, ElementRequest req);
    Task<ServiceResult>                         DeleteAsync(int userId, int elementId);
    Task<ServiceResult<ElementProductEntryDto>> AddProductAsync(int userId, int elementId, AddProductToElementRequest req);
    Task<ServiceResult>                         RemoveProductAsync(int userId, int elementId, int epId);
}

public class ElementService : IElementService
{
    private readonly PlatformContext _db;
    public ElementService(PlatformContext db) => _db = db;

    public async Task<List<ElementSummaryDto>> ListAsync(int userId)
        => await _db.Elements
                    .Where(e => e.ArchitectId == userId)
                    .OrderByDescending(e => e.CreatedDate)
                    .Select(e => new ElementSummaryDto
                    {
                        Id                    = e.Id,
                        Name                  = e.Name,
                        Description           = e.Description,
                        Bim7aaCategory        = e.Bim7aaCategory,
                        Bim7aaSubcategory     = e.Bim7aaSubcategory,
                        CreatedDate           = e.CreatedDate,
                        ProductCount          = e.ElementProducts.Count,
                        GwpSum                = e.ElementProducts
                                                  .Where(ep => ep.Product.GwpA1A3 != null)
                                                  .Sum(ep => (double?)ep.Product.GwpA1A3),
                        CreatedByUsername     = e.Architect.Username,
                        ProjectNames          = e.ProjectElements.Select(pe => pe.Project.Name).ToList(),
                        TypeNumber            = e.TypeNumber,
                        BuildingComponents    = e.BuildingComponents,
                        Status                = e.Status,
                        Entreprise            = e.Entreprise,
                        WorkDescriptionNumber = e.WorkDescriptionNumber,
                        Work                  = e.Work,
                        Responsibility        = e.Responsibility,
                        SoundRequirement      = e.SoundRequirement,
                        UValue                = e.UValue,
                        FireClass             = e.FireClass,
                        SelfWeight            = e.SelfWeight,
                        UnitPrice             = e.UnitPrice,
                        Unit                  = e.Unit,
                        BuildingPartAnalysis  = e.BuildingPartAnalysis,
                    })
                    .ToListAsync();

    public async Task<ServiceResult<ElementDetailDto>> GetByIdAsync(int userId, int elementId)
    {
        var e = await _db.Elements
            .Where(x => x.Id == elementId && x.ArchitectId == userId)
            .Include(x => x.Architect)
            .Include(x => x.ElementProducts)
                .ThenInclude(ep => ep.Product)
                    .ThenInclude(p => p.Manufacturer)
            .Include(x => x.ProjectElements)
                .ThenInclude(pe => pe.Project)
            .FirstOrDefaultAsync();

        if (e is null) return ServiceResult<ElementDetailDto>.Fail(ServiceError.NotFound);

        return ServiceResult<ElementDetailDto>.Ok(new ElementDetailDto
        {
            Id                    = e.Id,
            Name                  = e.Name,
            Description           = e.Description,
            Bim7aaCategory        = e.Bim7aaCategory,
            Bim7aaSubcategory     = e.Bim7aaSubcategory,
            CreatedDate           = e.CreatedDate,
            CreatedByUsername     = e.Architect.Username,
            ProjectNames          = e.ProjectElements.Select(pe => pe.Project.Name).ToList(),
            TypeNumber            = e.TypeNumber,
            BuildingComponents    = e.BuildingComponents,
            Status                = e.Status,
            Entreprise            = e.Entreprise,
            WorkDescriptionNumber = e.WorkDescriptionNumber,
            Work                  = e.Work,
            Responsibility        = e.Responsibility,
            SoundRequirement      = e.SoundRequirement,
            UValue                = e.UValue,
            FireClass             = e.FireClass,
            SelfWeight            = e.SelfWeight,
            UnitPrice             = e.UnitPrice,
            Unit                  = e.Unit,
            BuildingPartAnalysis  = e.BuildingPartAnalysis,
            Products              = e.ElementProducts.Select(ep => new ElementProductEntryDto(
                ep.Id,
                ep.Notes,
                ep.Amount,
                ep.Unit,
                new ProductInElementDto(
                    ep.Product.Id,
                    ep.Product.Name,
                    ep.Product.Category,
                    ep.Product.Material,
                    ep.Product.FireRating,
                    ep.Product.GwpA1A3,
                    ep.Product.GwpB4,
                    ep.Product.GwpB6,
                    ep.Product.GwpC3,
                    ep.Product.GwpC4,
                    ep.Product.ManufacturerId,
                    ep.Product.Manufacturer?.CompanyName ?? ep.Product.Manufacturer?.Username)
            )).ToList(),
        });
    }

    public async Task<ElementSummaryDto> CreateAsync(int userId, ElementRequest req)
    {
        var element = new Element
        {
            Name                  = req.Name.Trim(),
            Description           = req.Description?.Trim(),
            Bim7aaCategory        = Math.Clamp(req.Bim7aaCategory, 0, 9),
            Bim7aaSubcategory     = req.Bim7aaSubcategory?.Trim(),
            ArchitectId           = userId,
            CreatedDate           = DateTime.UtcNow,
            TypeNumber            = req.TypeNumber?.Trim(),
            BuildingComponents    = req.BuildingComponents?.Trim(),
            Status                = req.Status,
            Entreprise            = req.Entreprise?.Trim(),
            WorkDescriptionNumber = req.WorkDescriptionNumber?.Trim(),
            Work                  = req.Work?.Trim(),
            Responsibility        = req.Responsibility?.Trim(),
            SoundRequirement      = req.SoundRequirement?.Trim(),
            UValue                = req.UValue,
            FireClass             = req.FireClass?.Trim(),
            SelfWeight            = req.SelfWeight,
            UnitPrice             = req.UnitPrice,
            Unit                  = req.Unit?.Trim(),
            BuildingPartAnalysis  = req.BuildingPartAnalysis?.Trim(),
        };
        _db.Elements.Add(element);
        await _db.SaveChangesAsync();

        return new ElementSummaryDto
        {
            Id = element.Id, Name = element.Name, Description = element.Description,
            Bim7aaCategory = element.Bim7aaCategory, Bim7aaSubcategory = element.Bim7aaSubcategory,
            CreatedDate = element.CreatedDate, ProductCount = 0,
            TypeNumber = element.TypeNumber, BuildingComponents = element.BuildingComponents,
            Status = element.Status,
        };
    }

    public async Task<ServiceResult<ElementSummaryDto>> UpdateAsync(int userId, int elementId, ElementRequest req)
    {
        var element = await _db.Elements.FirstOrDefaultAsync(e => e.Id == elementId && e.ArchitectId == userId);
        if (element is null) return ServiceResult<ElementSummaryDto>.Fail(ServiceError.NotFound);

        element.Name                  = req.Name.Trim();
        element.Description           = req.Description?.Trim();
        element.Bim7aaCategory        = Math.Clamp(req.Bim7aaCategory, 0, 9);
        element.Bim7aaSubcategory     = req.Bim7aaSubcategory?.Trim();
        element.TypeNumber            = req.TypeNumber?.Trim();
        element.BuildingComponents    = req.BuildingComponents?.Trim();
        element.Status                = req.Status;
        element.Entreprise            = req.Entreprise?.Trim();
        element.WorkDescriptionNumber = req.WorkDescriptionNumber?.Trim();
        element.Work                  = req.Work?.Trim();
        element.Responsibility        = req.Responsibility?.Trim();
        element.SoundRequirement      = req.SoundRequirement?.Trim();
        element.UValue                = req.UValue;
        element.FireClass             = req.FireClass?.Trim();
        element.SelfWeight            = req.SelfWeight;
        element.UnitPrice             = req.UnitPrice;
        element.Unit                  = req.Unit?.Trim();
        element.BuildingPartAnalysis  = req.BuildingPartAnalysis?.Trim();
        await _db.SaveChangesAsync();

        await _db.Entry(element).Collection(e => e.ElementProducts).Query()
                  .Include(ep => ep.Product).LoadAsync();

        return ServiceResult<ElementSummaryDto>.Ok(new ElementSummaryDto
        {
            Id = element.Id, Name = element.Name, Description = element.Description,
            Bim7aaCategory = element.Bim7aaCategory, Bim7aaSubcategory = element.Bim7aaSubcategory,
            CreatedDate = element.CreatedDate,
            ProductCount = element.ElementProducts.Count,
            GwpSum = element.ElementProducts.Where(ep => ep.Product.GwpA1A3 != null)
                                            .Sum(ep => (double?)ep.Product.GwpA1A3),
            TypeNumber = element.TypeNumber, BuildingComponents = element.BuildingComponents,
            Status = element.Status,
        });
    }

    public async Task<ServiceResult> DeleteAsync(int userId, int elementId)
    {
        var element = await _db.Elements.FirstOrDefaultAsync(e => e.Id == elementId && e.ArchitectId == userId);
        if (element is null) return ServiceResult.Fail(ServiceError.NotFound);
        _db.Elements.Remove(element);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult<ElementProductEntryDto>> AddProductAsync(int userId, int elementId, AddProductToElementRequest req)
    {
        var element = await _db.Elements.FirstOrDefaultAsync(e => e.Id == elementId && e.ArchitectId == userId);
        if (element is null) return ServiceResult<ElementProductEntryDto>.Fail(ServiceError.NotFound);

        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == req.ProductId);
        if (product is null) return ServiceResult<ElementProductEntryDto>.Fail(ServiceError.NotFound, "Product not found.");

        var already = await _db.ElementProducts.AnyAsync(ep => ep.ElementId == elementId && ep.ProductId == req.ProductId);
        if (already) return ServiceResult<ElementProductEntryDto>.Fail(ServiceError.Conflict, "Product is already in this element.");

        var ep = new ElementProduct { ElementId = elementId, ProductId = req.ProductId, Notes = req.Notes?.Trim(), Amount = req.Amount, Unit = req.Unit?.Trim() };
        _db.ElementProducts.Add(ep);
        await _db.SaveChangesAsync();

        await _db.Entry(ep).Reference(x => x.Product).LoadAsync();
        await _db.Entry(ep.Product).Reference(x => x.Manufacturer).LoadAsync();

        return ServiceResult<ElementProductEntryDto>.Ok(new ElementProductEntryDto(
            ep.Id, ep.Notes, ep.Amount, ep.Unit,
            new ProductInElementDto(
                ep.Product.Id, ep.Product.Name, ep.Product.Category, ep.Product.Material,
                ep.Product.FireRating, ep.Product.GwpA1A3, ep.Product.GwpB4, ep.Product.GwpB6,
                ep.Product.GwpC3, ep.Product.GwpC4, ep.Product.ManufacturerId,
                ep.Product.Manufacturer?.CompanyName ?? ep.Product.Manufacturer?.Username)));
    }

    public async Task<ServiceResult> RemoveProductAsync(int userId, int elementId, int epId)
    {
        var element = await _db.Elements.FirstOrDefaultAsync(e => e.Id == elementId && e.ArchitectId == userId);
        if (element is null) return ServiceResult.Fail(ServiceError.NotFound);

        var ep = await _db.ElementProducts.FirstOrDefaultAsync(ep => ep.Id == epId && ep.ElementId == elementId);
        if (ep is null) return ServiceResult.Fail(ServiceError.NotFound);

        _db.ElementProducts.Remove(ep);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
