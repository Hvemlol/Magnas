using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Platform.Api.DTOs;

// -- Request types -------------------------------------------------------------
public class ProjectRequest
{
    [Required][StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Description { get; set; }

    [StringLength(200)]
    public string? Location { get; set; }
}

public class GroupRequest
{
    [Required][StringLength(100)]
    public string Name { get; set; } = string.Empty;
}

public class AddProductToProjectRequest
{
    [Range(1, int.MaxValue)]
    public int ProductId { get; set; }

    public int? GroupId { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class UpdateProjectProductRequest
{
    public int? GroupId { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class AddElementToProjectRequest
{
    [Range(1, int.MaxValue)]
    public int ElementId { get; set; }

    public int? GroupId { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

// -- Response types ------------------------------------------------------------
public record InviteRequest(string Username);

public record ProjectMemberDto(
    int      Id,
    int      UserId,
    string   Username,
    string   Status,
    DateTime JoinedDate);

public record PendingInviteDto(
    int      ProjectId,
    string   ProjectName,
    string   OwnerUsername,
    DateTime InvitedDate);

public record ProjectSummaryDto(
    int      Id,
    string   Name,
    string?  Description,
    string?  Location,
    DateTime CreatedDate,
    int      ProductCount,
    int      GroupCount,
    int      MemberCount,
    bool     IsOwner);

public record ProjectDetailDto(
    int                      Id,
    string                   Name,
    string?                  Description,
    string?                  Location,
    DateTime                 CreatedDate,
    List<GroupDto>           Groups,
    List<ProjectProductDto>  Products,
    List<ProjectElementDto>  Elements,
    List<ProjectMemberDto>   Members,
    bool                     IsOwner,
    string                   OwnerUsername);

public record GroupDto(int Id, string Name, int SortOrder);

public record ProjectProductDto(
    int                    Id,
    string?                Notes,
    DateTime               AddedDate,
    int?                   GroupId,
    string?                GroupName,
    bool                   CanEdit,
    ProjectProductInfoDto  Product);

public record ProjectProductInfoDto(
    int      Id,
    string   Name,
    string?  Category,
    string?  Material,
    string?  DeclaredUnit,
    string?  FireRating,
    decimal? GwpA1A3,
    decimal? GwpB4,
    decimal? GwpB6,
    decimal? GwpC3,
    decimal? GwpC4,
    string?  Certifications,
    int      ManufacturerId,
    string?  ManufacturerName);

public record ProjectElementDto(
    int                    Id,
    string?                Notes,
    DateTime               AddedDate,
    int?                   GroupId,
    string?                GroupName,
    bool                   CanEdit,
    ProjectElementInfoDto  Element);

public record ProjectElementInfoDto(
    int     Id,
    string  Name,
    string? Description,
    int     Bim7aaCategory,
    int     ProductCount,
    double? GwpSum);