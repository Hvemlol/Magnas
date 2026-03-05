using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Platform.Api.DTOs;

// -- Request types -------------------------------------------------------------

public class ElementRequest
{
    [Required][StringLength(200)]
    public string Name { get; set; }

    [StringLength(2000)]
    public string? Description { get; set; }

    public int Bim7aaCategory { get; set; }

    [StringLength(100)]
    public string? Bim7aaSubcategory { get; set; }

    [StringLength(100)]
    public string? TypeNumber { get; set; }

    [StringLength(2000)]
    public string? BuildingComponents { get; set; }

    [Range(1, 3)]
    public int? Status { get; set; }

    [StringLength(200)]
    public string? Entreprise { get; set; }

    [StringLength(200)]
    public string? WorkDescriptionNumber { get; set; }

    [StringLength(2000)]
    public string? Work { get; set; }

    [StringLength(200)]
    public string? Responsibility { get; set; }

    [StringLength(200)]
    public string? SoundRequirement { get; set; }

    public decimal? UValue { get; set; }

    [StringLength(100)]
    public string? FireClass { get; set; }

    public decimal? SelfWeight { get; set; }

    public decimal? UnitPrice { get; set; }

    [StringLength(50)]
    public string? Unit { get; set; }

    [StringLength(500)]
    public string? BuildingPartAnalysis { get; set; }
}

public class AddProductToElementRequest
{
    [Range(1, int.MaxValue)]
    public int ProductId { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

// -- Response types ------------------------------------------------------------

public record ElementSummaryDto
{
    public int       Id                    { get; init; }
    public string    Name                  { get; init; } = "";
    public string?   Description           { get; init; }
    public int       Bim7aaCategory        { get; init; }
    public string?   Bim7aaSubcategory     { get; init; }
    public DateTime  CreatedDate           { get; init; }
    public int       ProductCount          { get; init; }
    public double?   GwpSum               { get; init; }
    public string?   CreatedByUsername     { get; init; }
    public List<string> ProjectNames       { get; init; } = new();

    // Extended fields
    public string?   TypeNumber            { get; init; }
    public string?   BuildingComponents    { get; init; }
    public int?      Status               { get; init; }
    public string?   Entreprise            { get; init; }
    public string?   WorkDescriptionNumber { get; init; }
    public string?   Work                  { get; init; }
    public string?   Responsibility        { get; init; }
    public string?   SoundRequirement      { get; init; }
    public decimal?  UValue               { get; init; }
    public string?   FireClass             { get; init; }
    public decimal?  SelfWeight            { get; init; }
    public decimal?  UnitPrice             { get; init; }
    public string?   Unit                  { get; init; }
    public string?   BuildingPartAnalysis  { get; init; }
}

public record ElementDetailDto
{
    public int       Id                    { get; init; }
    public string    Name                  { get; init; } = "";
    public string?   Description           { get; init; }
    public int       Bim7aaCategory        { get; init; }
    public string?   Bim7aaSubcategory     { get; init; }
    public DateTime  CreatedDate           { get; init; }
    public string?   CreatedByUsername     { get; init; }
    public List<string> ProjectNames       { get; init; } = new();

    // Extended fields
    public string?   TypeNumber            { get; init; }
    public string?   BuildingComponents    { get; init; }
    public int?      Status               { get; init; }
    public string?   Entreprise            { get; init; }
    public string?   WorkDescriptionNumber { get; init; }
    public string?   Work                  { get; init; }
    public string?   Responsibility        { get; init; }
    public string?   SoundRequirement      { get; init; }
    public decimal?  UValue               { get; init; }
    public string?   FireClass             { get; init; }
    public decimal?  SelfWeight            { get; init; }
    public decimal?  UnitPrice             { get; init; }
    public string?   Unit                  { get; init; }
    public string?   BuildingPartAnalysis  { get; init; }

    public List<ElementProductEntryDto> Products { get; init; } = new();
}

public record ElementProductEntryDto(
    int                  Id,
    string?              Notes,
    ProductInElementDto  Product);

public record ProductInElementDto(
    int      Id,
    string   Name,
    string?  Category,
    string?  Material,
    string?  FireRating,
    decimal? GwpA1A3,
    decimal? GwpB4,
    decimal? GwpB6,
    decimal? GwpC3,
    decimal? GwpC4,
    int      ManufacturerId,
    string?  ManufacturerName);
