using System.ComponentModel.DataAnnotations;

namespace Platform.Api.DTOs;

// -- Request types -------------------------------------------------------------
public class SaveRequest
{
    [Range(1, int.MaxValue)]
    public int ProductId { get; set; }
}

// -- Response types ------------------------------------------------------------
public record SavedProductDto(int SavedId, SavedProductInfoDto Product);

public record SavedProductInfoDto(
    int      Id,
    string   Name,
    string?  Category,
    string?  Material,
    string?  FireRating,
    decimal? GwpA1A3,
    int      ManufacturerId,
    string?  ManufacturerName);