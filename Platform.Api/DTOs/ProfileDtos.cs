using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Platform.Api.DTOs;

// -- Request types -------------------------------------------------------------
public class ArchitectProfileUpdateRequest
{
    [StringLength(200)]
    public string? CompanyName { get; set; }

    [StringLength(2000)]
    public string? Bio { get; set; }

    [StringLength(200)]
    public string? Location { get; set; }

    [StringLength(500)]
    public string? Website { get; set; }

    [StringLength(500)]
    public string? LinkedIn { get; set; }
}

public class UpdateManufacturerProfileRequest
{
    [StringLength(200)]
    public string? CompanyName { get; set; }

    [StringLength(2000)]
    public string? Bio { get; set; }

    [StringLength(200)]
    public string? Location { get; set; }

    [StringLength(500)]
    public string? Website { get; set; }

    [StringLength(500)]
    public string? LinkedIn { get; set; }
}

// -- Response types ------------------------------------------------------------
public record ArchitectProfileDto(
    int      Id,
    string   Username,
    string   Email,
    string?  CompanyName,
    string?  Bio,
    string?  Location,
    string?  Website,
    string?  LinkedIn,
    DateTime CreatedDate,
    int      ProjectCount,
    int      ElementCount,
    int      SavedCount);

public record ArchitectProfileUpdateResponseDto(
    int     Id,
    string  Username,
    string  Email,
    string? CompanyName,
    string? Bio,
    string? Location,
    string? Website,
    string? LinkedIn);

public record ManufacturerProfileDto(
    int                           Id,
    string                        Username,
    string?                       CompanyName,
    string?                       Bio,
    string?                       Location,
    string?                       Website,
    string?                       LinkedIn,
    DateTime                      MemberSince,
    int                           ProductCount,
    List<ManufacturerProductDto>  Products);

public record ManufacturerProfileUpdateResponseDto(
    string? CompanyName,
    string? Bio,
    string? Location,
    string? Website,
    string? LinkedIn);

public record ManufacturerProductDto(
    int      Id,
    string   Name,
    string?  Description,
    string?  Category,
    string?  Material,
    string?  FireRating,
    decimal? GwpA1A3,
    string?  Certifications,
    int      ManufacturerId,
    DateTime CreatedDate);