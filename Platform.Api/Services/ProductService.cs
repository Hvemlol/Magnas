using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Platform.Api.Data;
using Platform.Api.DTOs;
using Platform.Api.Models;

namespace Platform.Api.Services;

public interface IProductService
{
    Task<List<ProductResponse>>           GetPublishedAsync(string? search, string? category);
    Task<List<ProductResponse>>           GetByManufacturerAsync(int userId);
    Task<ServiceResult<ProductResponse>>  GetByIdAsync(int id);
    Task<ServiceResult<ProductResponse>>  CreateAsync(int userId, ProductRequest req);
    Task<ServiceResult<ProductResponse>>  UpdateAsync(int userId, int productId, ProductRequest req);
    Task<ServiceResult<object>>           TogglePublishAsync(int userId, int productId);
    Task<ServiceResult>                   DeleteAsync(int userId, int productId);
}

public class ProductService : IProductService
{
    private readonly PlatformContext _db;
    public ProductService(PlatformContext db) => _db = db;

    public async Task<List<ProductResponse>> GetPublishedAsync(string? search, string? category)
    {
        var query = _db.Products.Include(p => p.Manufacturer)
                                .Where(p => p.IsPublished)
                                .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p =>
                p.Name.Contains(search) ||
                p.Description.Contains(search) ||
                p.Material.Contains(search) ||
                p.Category.Contains(search));

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        return await query.OrderByDescending(p => p.CreatedDate)
                          .Select(p => ToResponse(p))
                          .ToListAsync();
    }

    public async Task<List<ProductResponse>> GetByManufacturerAsync(int userId)
        => await _db.Products
                    .Include(p => p.Manufacturer)
                    .Where(p => p.ManufacturerId == userId)
                    .OrderByDescending(p => p.CreatedDate)
                    .Select(p => ToResponse(p))
                    .ToListAsync();

    public async Task<ServiceResult<ProductResponse>> GetByIdAsync(int id)
    {
        var product = await _db.Products.Include(p => p.Manufacturer)
                                        .FirstOrDefaultAsync(p => p.Id == id && p.IsPublished);
        return product is null
            ? ServiceResult<ProductResponse>.Fail(ServiceError.NotFound)
            : ServiceResult<ProductResponse>.Ok(ToResponse(product));
    }

    public async Task<ServiceResult<ProductResponse>> CreateAsync(int userId, ProductRequest req)
    {
        var product = new Product
        {
            Name                     = req.Name,
            Description              = req.Description,
            Category                 = req.Category,
            Material                 = req.Material,
            DeclaredUnit             = req.DeclaredUnit,
            FireRating               = req.FireRating,
            FireResistance           = req.FireResistance,
            WeightPerUnit            = req.WeightPerUnit,
            Thickness                = req.Thickness,
            Width                    = req.Width,
            Height                   = req.Height,
            Length                   = req.Length,
            ThermalPerformance       = req.ThermalPerformance,
            SoundReductionRw         = req.SoundReductionRw,
            SoundReductionRwCCtr     = req.SoundReductionRwCCtr,
            SoundAbsorptionAlphaW    = req.SoundAbsorptionAlphaW,
            AcousticRating           = req.AcousticRating,
            Certifications           = req.Certifications,
            EpdUrl                   = req.EpdUrl,
            GwpA1A3                  = req.GwpA1A3,
            GwpB4                    = req.GwpB4,
            GwpB6                    = req.GwpB6,
            GwpC3                    = req.GwpC3,
            GwpC4                    = req.GwpC4,
            DatasheetUrl             = req.DatasheetUrl,
            BimUrl                   = req.BimUrl,
            InstallationGuideUrl     = req.InstallationGuideUrl,
            FireCertificateUrl       = req.FireCertificateUrl,
            SoundTestReportUrl       = req.SoundTestReportUrl,
            CeDeclarationUrl         = req.CeDeclarationUrl,
            IsPublished              = req.IsPublished,
            ManufacturerId           = userId,
            CreatedDate              = DateTime.UtcNow,
            UpdatedDate              = DateTime.UtcNow,
        };
        _db.Products.Add(product);
        await _db.SaveChangesAsync();
        await _db.Entry(product).Reference(p => p.Manufacturer).LoadAsync();
        return ServiceResult<ProductResponse>.Ok(ToResponse(product));
    }

    public async Task<ServiceResult<ProductResponse>> UpdateAsync(int userId, int productId, ProductRequest req)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == productId && p.ManufacturerId == userId);
        if (product is null) return ServiceResult<ProductResponse>.Fail(ServiceError.NotFound);

        product.Name                     = req.Name;
        product.Description              = req.Description;
        product.Category                 = req.Category;
        product.Material                 = req.Material;
        product.DeclaredUnit             = req.DeclaredUnit;
        product.FireRating               = req.FireRating;
        product.FireResistance           = req.FireResistance;
        product.WeightPerUnit            = req.WeightPerUnit;
        product.Thickness                = req.Thickness;
        product.Width                    = req.Width;
        product.Height                   = req.Height;
        product.Length                   = req.Length;
        product.ThermalPerformance       = req.ThermalPerformance;
        product.SoundReductionRw         = req.SoundReductionRw;
        product.SoundReductionRwCCtr     = req.SoundReductionRwCCtr;
        product.SoundAbsorptionAlphaW    = req.SoundAbsorptionAlphaW;
        product.AcousticRating           = req.AcousticRating;
        product.Certifications           = req.Certifications;
        product.EpdUrl                   = req.EpdUrl;
        product.GwpA1A3                  = req.GwpA1A3;
        product.GwpB4                    = req.GwpB4;
        product.GwpB6                    = req.GwpB6;
        product.GwpC3                    = req.GwpC3;
        product.GwpC4                    = req.GwpC4;
        product.DatasheetUrl             = req.DatasheetUrl;
        product.BimUrl                   = req.BimUrl;
        product.InstallationGuideUrl     = req.InstallationGuideUrl;
        product.FireCertificateUrl       = req.FireCertificateUrl;
        product.SoundTestReportUrl       = req.SoundTestReportUrl;
        product.CeDeclarationUrl         = req.CeDeclarationUrl;
        product.IsPublished              = req.IsPublished;
        product.UpdatedDate              = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(product).Reference(p => p.Manufacturer).LoadAsync();
        return ServiceResult<ProductResponse>.Ok(ToResponse(product));
    }

    public async Task<ServiceResult<object>> TogglePublishAsync(int userId, int productId)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == productId && p.ManufacturerId == userId);
        if (product is null) return ServiceResult<object>.Fail(ServiceError.NotFound);

        product.IsPublished = !product.IsPublished;
        product.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult<object>.Ok(new { product.IsPublished });
    }

    public async Task<ServiceResult> DeleteAsync(int userId, int productId)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == productId && p.ManufacturerId == userId);
        if (product is null) return ServiceResult.Fail(ServiceError.NotFound);

        _db.Products.Remove(product);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private static ProductResponse ToResponse(Product p) => new()
    {
        Id                       = p.Id,
        Name                     = p.Name,
        Description              = p.Description,
        Category                 = p.Category,
        Material                 = p.Material,
        DeclaredUnit             = p.DeclaredUnit,
        FireRating               = p.FireRating,
        FireResistance           = p.FireResistance,
        WeightPerUnit            = p.WeightPerUnit,
        Thickness                = p.Thickness,
        Width                    = p.Width,
        Height                   = p.Height,
        Length                   = p.Length,
        ThermalPerformance       = p.ThermalPerformance,
        SoundReductionRw         = p.SoundReductionRw,
        SoundReductionRwCCtr     = p.SoundReductionRwCCtr,
        SoundAbsorptionAlphaW    = p.SoundAbsorptionAlphaW,
        AcousticRating           = p.AcousticRating,
        Certifications           = p.Certifications,
        EpdUrl                   = p.EpdUrl,
        GwpA1A3                  = p.GwpA1A3,
        GwpB4                    = p.GwpB4,
        GwpB6                    = p.GwpB6,
        GwpC3                    = p.GwpC3,
        GwpC4                    = p.GwpC4,
        DatasheetUrl             = p.DatasheetUrl,
        BimUrl                   = p.BimUrl,
        InstallationGuideUrl     = p.InstallationGuideUrl,
        FireCertificateUrl       = p.FireCertificateUrl,
        SoundTestReportUrl       = p.SoundTestReportUrl,
        CeDeclarationUrl         = p.CeDeclarationUrl,
        IsPublished              = p.IsPublished,
        ManufacturerId           = p.ManufacturerId,
        ManufacturerName         = p.Manufacturer?.CompanyName ?? p.Manufacturer?.Username,
        CreatedDate              = p.CreatedDate,
    };
}
