using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Platform.Api.Data;
using Platform.Api.DTOs;

namespace Platform.Api.Services;

public interface ISavedProductService
{
    Task<List<SavedProductDto>>    GetByArchitectAsync(int userId);
    Task<ServiceResult<object>>    SaveAsync(int userId, SaveRequest req);
    Task<ServiceResult>            UnsaveAsync(int userId, int savedId);
}

public class SavedProductService : ISavedProductService
{
    private readonly PlatformContext _db;
    public SavedProductService(PlatformContext db) => _db = db;

    public async Task<List<SavedProductDto>> GetByArchitectAsync(int userId)
        => await _db.SavedProducts
                    .Include(s => s.Product).ThenInclude(p => p.Manufacturer)
                    .Where(s => s.ArchitectId == userId)
                    .Select(s => new SavedProductDto(
                        s.Id,
                        new SavedProductInfoDto(
                            s.Product.Id,
                            s.Product.Name,
                            s.Product.Category,
                            s.Product.Material,
                            s.Product.FireRating,
                            s.Product.GwpA1A3,
                            s.Product.ManufacturerId,
                            s.Product.Manufacturer.CompanyName ?? s.Product.Manufacturer.Username)))
                    .ToListAsync();

    public async Task<ServiceResult<object>> SaveAsync(int userId, SaveRequest req)
    {
        var already = await _db.SavedProducts.AnyAsync(s => s.ArchitectId == userId && s.ProductId == req.ProductId);
        if (already) return ServiceResult<object>.Fail(ServiceError.Conflict, "Product already saved.");

        var exists = await _db.Products.AnyAsync(p => p.Id == req.ProductId);
        if (!exists) return ServiceResult<object>.Fail(ServiceError.NotFound, "Product not found.");

        var saved = new Models.SavedProduct { ArchitectId = userId, ProductId = req.ProductId };
        _db.SavedProducts.Add(saved);
        await _db.SaveChangesAsync();
        return ServiceResult<object>.Ok(new { saved.Id });
    }

    public async Task<ServiceResult> UnsaveAsync(int userId, int savedId)
    {
        var saved = await _db.SavedProducts.FirstOrDefaultAsync(s => s.Id == savedId && s.ArchitectId == userId);
        if (saved is null) return ServiceResult.Fail(ServiceError.NotFound);
        _db.SavedProducts.Remove(saved);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
