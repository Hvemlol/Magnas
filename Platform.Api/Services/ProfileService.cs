using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Platform.Api.Data;
using Platform.Api.DTOs;
using Platform.Api.Models;

namespace Platform.Api.Services;

public interface IProfileService
{
    Task<ServiceResult<ArchitectProfileDto>>              GetArchitectProfileAsync(int userId);
    Task<ServiceResult<ArchitectProfileUpdateResponseDto>> UpdateArchitectProfileAsync(int userId, ArchitectProfileUpdateRequest req);
    Task<ServiceResult<ManufacturerProfileDto>>           GetManufacturerProfileAsync(int manufacturerId);
    Task<ServiceResult<ManufacturerProfileUpdateResponseDto>> UpdateManufacturerProfileAsync(int userId, UpdateManufacturerProfileRequest req);
}

public class ProfileService : IProfileService
{
    private readonly PlatformContext _db;
    public ProfileService(PlatformContext db) => _db = db;

    public async Task<ServiceResult<ArchitectProfileDto>> GetArchitectProfileAsync(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return ServiceResult<ArchitectProfileDto>.Fail(ServiceError.NotFound);

        var projectCount = await _db.Projects.CountAsync(p => p.ArchitectId == userId);
        var elementCount = await _db.Elements.CountAsync(e => e.ArchitectId == userId);
        var savedCount   = await _db.SavedProducts.CountAsync(s => s.ArchitectId == userId);

        return ServiceResult<ArchitectProfileDto>.Ok(new ArchitectProfileDto(
            user.Id, user.Username, user.Email,
            user.CompanyName, user.Bio, user.Location, user.Website, user.LinkedIn,
            user.CreatedDate, projectCount, elementCount, savedCount));
    }

    public async Task<ServiceResult<ArchitectProfileUpdateResponseDto>> UpdateArchitectProfileAsync(int userId, ArchitectProfileUpdateRequest req)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return ServiceResult<ArchitectProfileUpdateResponseDto>.Fail(ServiceError.NotFound);

        user.CompanyName = string.IsNullOrWhiteSpace(req.CompanyName) ? null : req.CompanyName.Trim();
        user.Bio         = string.IsNullOrWhiteSpace(req.Bio)         ? null : req.Bio.Trim();
        user.Location    = string.IsNullOrWhiteSpace(req.Location)    ? null : req.Location.Trim();
        user.Website     = string.IsNullOrWhiteSpace(req.Website)     ? null : req.Website.Trim();
        user.LinkedIn    = string.IsNullOrWhiteSpace(req.LinkedIn)    ? null : req.LinkedIn.Trim();
        await _db.SaveChangesAsync();

        return ServiceResult<ArchitectProfileUpdateResponseDto>.Ok(new ArchitectProfileUpdateResponseDto(
            user.Id, user.Username, user.Email,
            user.CompanyName, user.Bio, user.Location, user.Website, user.LinkedIn));
    }

    public async Task<ServiceResult<ManufacturerProfileDto>> GetManufacturerProfileAsync(int manufacturerId)
    {
        var manufacturer = await _db.Users.FirstOrDefaultAsync(
            u => u.Id == manufacturerId && u.Role == UserRole.Manufacturer);
        if (manufacturer is null) return ServiceResult<ManufacturerProfileDto>.Fail(ServiceError.NotFound);

        var products = await _db.Products
            .Where(p => p.ManufacturerId == manufacturerId && p.IsPublished)
            .OrderByDescending(p => p.CreatedDate)
            .Select(p => new ManufacturerProductDto(
                p.Id, p.Name, p.Description, p.Category, p.Material,
                p.FireRating, p.GwpA1A3, p.Certifications, p.ManufacturerId, p.CreatedDate))
            .ToListAsync();

        return ServiceResult<ManufacturerProfileDto>.Ok(new ManufacturerProfileDto(
            manufacturer.Id, manufacturer.Username, manufacturer.CompanyName,
            manufacturer.Bio, manufacturer.Location, manufacturer.Website, manufacturer.LinkedIn,
            manufacturer.CreatedDate, products.Count, products));
    }

    public async Task<ServiceResult<ManufacturerProfileUpdateResponseDto>> UpdateManufacturerProfileAsync(int userId, UpdateManufacturerProfileRequest req)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return ServiceResult<ManufacturerProfileUpdateResponseDto>.Fail(ServiceError.NotFound);

        user.CompanyName = req.CompanyName?.Trim();
        user.Bio         = req.Bio?.Trim();
        user.Location    = req.Location?.Trim();
        user.Website     = req.Website?.Trim();
        user.LinkedIn    = req.LinkedIn?.Trim();
        await _db.SaveChangesAsync();

        return ServiceResult<ManufacturerProfileUpdateResponseDto>.Ok(new ManufacturerProfileUpdateResponseDto(
            user.CompanyName, user.Bio, user.Location, user.Website, user.LinkedIn));
    }
}
