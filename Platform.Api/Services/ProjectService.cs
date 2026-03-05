using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Platform.Api.Data;
using Platform.Api.DTOs;
using Platform.Api.Models;

namespace Platform.Api.Services;

public interface IProjectService
{
    Task<List<ProjectSummaryDto>>           ListAsync(int userId);
    Task<ServiceResult<ProjectDetailDto>>   GetByIdAsync(int userId, int projectId);
    Task<ProjectSummaryDto>                 CreateAsync(int userId, ProjectRequest req);
    Task<ServiceResult>                     UpdateAsync(int userId, int projectId, ProjectRequest req);
    Task<ServiceResult>                     DeleteAsync(int userId, int projectId);
    Task<ServiceResult<GroupDto>>           AddGroupAsync(int userId, int projectId, GroupRequest req);
    Task<ServiceResult<GroupDto>>           UpdateGroupAsync(int userId, int projectId, int groupId, GroupRequest req);
    Task<ServiceResult>                     DeleteGroupAsync(int userId, int projectId, int groupId);
    Task<ServiceResult<object>>             AddProductAsync(int userId, int projectId, AddProductToProjectRequest req);
    Task<ServiceResult<object>>             UpdateProductAsync(int userId, int projectId, int ppId, UpdateProjectProductRequest req);
    Task<ServiceResult>                     RemoveProductAsync(int userId, int projectId, int ppId);
    Task<ServiceResult<ProjectElementDto>>  AddElementAsync(int userId, int projectId, AddElementToProjectRequest req);
    Task<ServiceResult<object>>             UpdateElementAsync(int userId, int projectId, int peId, UpdateProjectProductRequest req);
    Task<ServiceResult>                     RemoveElementAsync(int userId, int projectId, int peId);
    Task<ServiceResult>                     InviteAsync(int ownerId, int projectId, InviteRequest req);
    Task<ServiceResult>                     AcceptInviteAsync(int userId, int projectId);
    Task<ServiceResult>                     DeclineInviteAsync(int userId, int projectId);
    Task<ServiceResult>                     RemoveMemberAsync(int ownerId, int projectId, int memberId);
    Task<List<PendingInviteDto>>            GetPendingInvitesAsync(int userId);
    Task<ServiceResult<List<ProjectMemberDto>>> GetMembersAsync(int userId, int projectId);
}

public class ProjectService : IProjectService
{
    private readonly PlatformContext _db;
    public ProjectService(PlatformContext db) => _db = db;

    private Task<bool> OwnsProjectAsync(int userId, int projectId) =>
        _db.Projects.AnyAsync(p => p.Id == projectId && p.ArchitectId == userId);

    private Task<bool> CanAccessProjectAsync(int userId, int projectId) =>
        _db.Projects.AnyAsync(p =>
            p.Id == projectId &&
            (p.ArchitectId == userId ||
             p.Members.Any(m => m.UserId == userId && m.Status == MemberStatus.Accepted)));

    // ── List / Get ────────────────────────────────────────────────────────────

    public async Task<List<ProjectSummaryDto>> ListAsync(int userId)
        => await _db.Projects
                    .Where(p => p.ArchitectId == userId ||
                                p.Members.Any(m => m.UserId == userId && m.Status == MemberStatus.Accepted))
                    .Include(p => p.Groups)
                    .Include(p => p.ProjectProducts)
                    .Include(p => p.Members)
                    .OrderByDescending(p => p.CreatedDate)
                    .Select(p => new ProjectSummaryDto(
                        p.Id,
                        p.Name,
                        p.Description,
                        p.Location,
                        p.CreatedDate,
                        p.ProjectProducts.Count,
                        p.Groups.Count,
                        p.Members.Count(m => m.Status == MemberStatus.Accepted),
                        p.ArchitectId == userId))
                    .ToListAsync();

    public async Task<ServiceResult<ProjectDetailDto>> GetByIdAsync(int userId, int projectId)
    {
        if (!await CanAccessProjectAsync(userId, projectId))
            return ServiceResult<ProjectDetailDto>.Fail(ServiceError.NotFound);

        var project = await _db.Projects
            .Where(p => p.Id == projectId)
            .Include(p => p.Architect)
            .Include(p => p.Groups)
            .Include(p => p.ProjectProducts)
                .ThenInclude(pp => pp.Product)
                    .ThenInclude(prod => prod.Manufacturer)
            .Include(p => p.ProjectProducts)
                .ThenInclude(pp => pp.Group)
            .Include(p => p.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync();

        if (project is null) return ServiceResult<ProjectDetailDto>.Fail(ServiceError.NotFound);

        var elements = await _db.ProjectElements
            .Where(pe => pe.ProjectId == projectId)
            .Include(pe => pe.Element)
                .ThenInclude(e => e.ElementProducts)
                    .ThenInclude(ep => ep.Product)
            .Include(pe => pe.Group)
            .ToListAsync();

        bool isOwner = project.ArchitectId == userId;

        var members = project.Members
            .Select(m => new ProjectMemberDto(
                m.Id,
                m.UserId,
                m.User.Username,
                m.Status.ToString(),
                m.CreatedDate))
            .ToList();

        var dto = new ProjectDetailDto(
            project.Id,
            project.Name,
            project.Description,
            project.Location,
            project.CreatedDate,
            project.Groups
                   .OrderBy(g => g.SortOrder)
                   .Select(g => new GroupDto(g.Id, g.Name, g.SortOrder))
                   .ToList(),
            project.ProjectProducts
                   .Select(pp => new ProjectProductDto(
                       pp.Id,
                       pp.Notes,
                       pp.AddedDate,
                       pp.GroupId,
                       pp.Group?.Name,
                       isOwner || pp.AddedByUserId == userId,
                       new ProjectProductInfoDto(
                           pp.Product.Id,
                           pp.Product.Name,
                           pp.Product.Category,
                           pp.Product.Material,
                           pp.Product.DeclaredUnit,
                           pp.Product.FireRating,
                           pp.Product.GwpA1A3,
                           pp.Product.GwpB4,
                           pp.Product.GwpB6,
                           pp.Product.GwpC3,
                           pp.Product.GwpC4,
                           pp.Product.Certifications,
                           pp.Product.ManufacturerId,
                           pp.Product.Manufacturer?.CompanyName ?? pp.Product.Manufacturer?.Username)))
                   .ToList(),
            elements
                .Select(pe => new ProjectElementDto(
                    pe.Id,
                    pe.Notes,
                    pe.AddedDate,
                    pe.GroupId,
                    pe.Group?.Name,
                    isOwner || pe.AddedByUserId == userId,
                    new ProjectElementInfoDto(
                        pe.Element.Id,
                        pe.Element.Name,
                        pe.Element.Description,
                        pe.Element.Bim7aaCategory,
                        pe.Element.ElementProducts.Count,
                        pe.Element.ElementProducts
                                  .Where(ep => ep.Product.GwpA1A3 != null)
                                  .Sum(ep => (double?)ep.Product.GwpA1A3))))
                .ToList(),
            members,
            isOwner,
            project.Architect.Username);

        return ServiceResult<ProjectDetailDto>.Ok(dto);
    }

    // ── Create / Update / Delete ──────────────────────────────────────────────

    public async Task<ProjectSummaryDto> CreateAsync(int userId, ProjectRequest req)
    {
        var project = new Project
        {
            Name        = req.Name.Trim(),
            Description = req.Description?.Trim(),
            Location    = req.Location?.Trim(),
            ArchitectId = userId,
            CreatedDate = DateTime.UtcNow,
        };
        _db.Projects.Add(project);
        await _db.SaveChangesAsync();
        return new ProjectSummaryDto(project.Id, project.Name, project.Description,
            project.Location, project.CreatedDate, 0, 0, 0, true);
    }

    public async Task<ServiceResult> UpdateAsync(int userId, int projectId, ProjectRequest req)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId && p.ArchitectId == userId);
        if (project is null) return ServiceResult.Fail(ServiceError.NotFound);

        project.Name        = req.Name.Trim();
        project.Description = req.Description?.Trim();
        project.Location    = req.Location?.Trim();
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> DeleteAsync(int userId, int projectId)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId && p.ArchitectId == userId);
        if (project is null) return ServiceResult.Fail(ServiceError.NotFound);
        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ── Groups ────────────────────────────────────────────────────────────────

    public async Task<ServiceResult<GroupDto>> AddGroupAsync(int userId, int projectId, GroupRequest req)
    {
        if (!await OwnsProjectAsync(userId, projectId))
            return ServiceResult<GroupDto>.Fail(ServiceError.NotFound);

        var sortOrder = await _db.ProjectGroups.CountAsync(g => g.ProjectId == projectId);

        var group = new ProjectGroup
        {
            ProjectId = projectId,
            Name      = req.Name.Trim(),
            SortOrder = sortOrder,
        };
        _db.ProjectGroups.Add(group);
        await _db.SaveChangesAsync();
        return ServiceResult<GroupDto>.Ok(new GroupDto(group.Id, group.Name, group.SortOrder));
    }

    public async Task<ServiceResult<GroupDto>> UpdateGroupAsync(int userId, int projectId, int groupId, GroupRequest req)
    {
        if (!await OwnsProjectAsync(userId, projectId))
            return ServiceResult<GroupDto>.Fail(ServiceError.NotFound);

        var group = await _db.ProjectGroups.FirstOrDefaultAsync(g => g.Id == groupId && g.ProjectId == projectId);
        if (group is null) return ServiceResult<GroupDto>.Fail(ServiceError.NotFound);

        group.Name = req.Name.Trim();
        await _db.SaveChangesAsync();
        return ServiceResult<GroupDto>.Ok(new GroupDto(group.Id, group.Name, group.SortOrder));
    }

    public async Task<ServiceResult> DeleteGroupAsync(int userId, int projectId, int groupId)
    {
        if (!await OwnsProjectAsync(userId, projectId))
            return ServiceResult.Fail(ServiceError.NotFound);

        var group = await _db.ProjectGroups.FirstOrDefaultAsync(g => g.Id == groupId && g.ProjectId == projectId);
        if (group is null) return ServiceResult.Fail(ServiceError.NotFound);

        _db.ProjectGroups.Remove(group);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ── Products ──────────────────────────────────────────────────────────────

    public async Task<ServiceResult<object>> AddProductAsync(int userId, int projectId, AddProductToProjectRequest req)
    {
        if (!await CanAccessProjectAsync(userId, projectId))
            return ServiceResult<object>.Fail(ServiceError.NotFound);

        var product = await _db.Products.FindAsync(req.ProductId);
        if (product is null) return ServiceResult<object>.Fail(ServiceError.NotFound, "Product not found.");

        if (req.GroupId.HasValue)
        {
            var groupExists = await _db.ProjectGroups.AnyAsync(g => g.Id == req.GroupId && g.ProjectId == projectId);
            if (!groupExists) return ServiceResult<object>.Fail(ServiceError.NotFound, "Group not found.");
        }

        var pp = new ProjectProduct
        {
            ProjectId      = projectId,
            ProductId      = req.ProductId,
            GroupId        = req.GroupId,
            Notes          = req.Notes?.Trim(),
            AddedDate      = DateTime.UtcNow,
            AddedByUserId  = userId,
        };
        _db.ProjectProducts.Add(pp);
        await _db.SaveChangesAsync();
        return ServiceResult<object>.Ok(new { pp.Id });
    }

    public async Task<ServiceResult<object>> UpdateProductAsync(int userId, int projectId, int ppId, UpdateProjectProductRequest req)
    {
        if (!await CanAccessProjectAsync(userId, projectId))
            return ServiceResult<object>.Fail(ServiceError.NotFound);

        var pp = await _db.ProjectProducts.FirstOrDefaultAsync(x => x.Id == ppId && x.ProjectId == projectId);
        if (pp is null) return ServiceResult<object>.Fail(ServiceError.NotFound);

        if (pp.AddedByUserId != userId && !await OwnsProjectAsync(userId, projectId))
            return ServiceResult<object>.Fail(ServiceError.Forbidden);

        if (req.GroupId.HasValue)
        {
            var groupExists = await _db.ProjectGroups.AnyAsync(g => g.Id == req.GroupId && g.ProjectId == projectId);
            if (!groupExists) return ServiceResult<object>.Fail(ServiceError.NotFound, "Group not found.");
        }

        pp.GroupId = req.GroupId;
        pp.Notes   = req.Notes?.Trim();
        await _db.SaveChangesAsync();
        return ServiceResult<object>.Ok(new { pp.Id, pp.GroupId, pp.Notes });
    }

    public async Task<ServiceResult> RemoveProductAsync(int userId, int projectId, int ppId)
    {
        if (!await CanAccessProjectAsync(userId, projectId))
            return ServiceResult.Fail(ServiceError.NotFound);

        var pp = await _db.ProjectProducts.FirstOrDefaultAsync(x => x.Id == ppId && x.ProjectId == projectId);
        if (pp is null) return ServiceResult.Fail(ServiceError.NotFound);

        if (pp.AddedByUserId != userId && !await OwnsProjectAsync(userId, projectId))
            return ServiceResult.Fail(ServiceError.Forbidden);

        _db.ProjectProducts.Remove(pp);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ── Elements ──────────────────────────────────────────────────────────────

    public async Task<ServiceResult<ProjectElementDto>> AddElementAsync(int userId, int projectId, AddElementToProjectRequest req)
    {
        if (!await CanAccessProjectAsync(userId, projectId))
            return ServiceResult<ProjectElementDto>.Fail(ServiceError.NotFound);

        var element = await _db.Elements
            .Include(e => e.ElementProducts)
                .ThenInclude(ep => ep.Product)
            .FirstOrDefaultAsync(e => e.Id == req.ElementId && e.ArchitectId == userId);
        if (element is null) return ServiceResult<ProjectElementDto>.Fail(ServiceError.NotFound, "Element not found.");

        if (req.GroupId.HasValue)
        {
            var groupExists = await _db.ProjectGroups.AnyAsync(g => g.Id == req.GroupId && g.ProjectId == projectId);
            if (!groupExists) return ServiceResult<ProjectElementDto>.Fail(ServiceError.NotFound, "Group not found.");
        }

        var pe = new ProjectElement
        {
            ProjectId     = projectId,
            ElementId     = req.ElementId,
            GroupId       = req.GroupId,
            Notes         = req.Notes?.Trim(),
            AddedDate     = DateTime.UtcNow,
            AddedByUserId = userId,
        };
        _db.ProjectElements.Add(pe);
        await _db.SaveChangesAsync();

        string? groupName = req.GroupId.HasValue
            ? (await _db.ProjectGroups.FindAsync(req.GroupId.Value))?.Name
            : null;

        return ServiceResult<ProjectElementDto>.Ok(new ProjectElementDto(
            pe.Id,
            pe.Notes,
            pe.AddedDate,
            pe.GroupId,
            groupName,
            true, // creator always can edit their own addition
            new ProjectElementInfoDto(
                element.Id,
                element.Name,
                element.Description,
                element.Bim7aaCategory,
                element.ElementProducts.Count,
                element.ElementProducts
                       .Where(ep => ep.Product.GwpA1A3 != null)
                       .Sum(ep => (double?)ep.Product.GwpA1A3))));
    }

    public async Task<ServiceResult<object>> UpdateElementAsync(int userId, int projectId, int peId, UpdateProjectProductRequest req)
    {
        if (!await CanAccessProjectAsync(userId, projectId))
            return ServiceResult<object>.Fail(ServiceError.NotFound);

        var pe = await _db.ProjectElements.FirstOrDefaultAsync(x => x.Id == peId && x.ProjectId == projectId);
        if (pe is null) return ServiceResult<object>.Fail(ServiceError.NotFound);

        if (pe.AddedByUserId != userId && !await OwnsProjectAsync(userId, projectId))
            return ServiceResult<object>.Fail(ServiceError.Forbidden);

        if (req.GroupId.HasValue)
        {
            var groupExists = await _db.ProjectGroups.AnyAsync(g => g.Id == req.GroupId && g.ProjectId == projectId);
            if (!groupExists) return ServiceResult<object>.Fail(ServiceError.NotFound, "Group not found.");
        }

        pe.GroupId = req.GroupId;
        pe.Notes   = req.Notes?.Trim();
        await _db.SaveChangesAsync();
        return ServiceResult<object>.Ok(new { pe.Id, pe.GroupId, pe.Notes });
    }

    public async Task<ServiceResult> RemoveElementAsync(int userId, int projectId, int peId)
    {
        if (!await CanAccessProjectAsync(userId, projectId))
            return ServiceResult.Fail(ServiceError.NotFound);

        var pe = await _db.ProjectElements.FirstOrDefaultAsync(x => x.Id == peId && x.ProjectId == projectId);
        if (pe is null) return ServiceResult.Fail(ServiceError.NotFound);

        if (pe.AddedByUserId != userId && !await OwnsProjectAsync(userId, projectId))
            return ServiceResult.Fail(ServiceError.Forbidden);

        _db.ProjectElements.Remove(pe);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ── Collaboration ─────────────────────────────────────────────────────────

    public async Task<ServiceResult> InviteAsync(int ownerId, int projectId, InviteRequest req)
    {
        if (!await OwnsProjectAsync(ownerId, projectId))
            return ServiceResult.Fail(ServiceError.NotFound);

        var invitee = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);
        if (invitee is null) return ServiceResult.Fail(ServiceError.NotFound, "User not found.");
        if (invitee.Id == ownerId) return ServiceResult.Fail(ServiceError.Conflict, "Cannot invite yourself.");

        var existing = await _db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == invitee.Id);
        if (existing) return ServiceResult.Fail(ServiceError.Conflict, "User is already a member or has a pending invite.");

        _db.ProjectMembers.Add(new ProjectMember
        {
            ProjectId       = projectId,
            UserId          = invitee.Id,
            InvitedByUserId = ownerId,
            Status          = MemberStatus.Pending,
            CreatedDate     = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> AcceptInviteAsync(int userId, int projectId)
    {
        var member = await _db.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId && m.Status == MemberStatus.Pending);
        if (member is null) return ServiceResult.Fail(ServiceError.NotFound);

        member.Status = MemberStatus.Accepted;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> DeclineInviteAsync(int userId, int projectId)
    {
        var member = await _db.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId && m.Status == MemberStatus.Pending);
        if (member is null) return ServiceResult.Fail(ServiceError.NotFound);

        _db.ProjectMembers.Remove(member);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> RemoveMemberAsync(int ownerId, int projectId, int memberId)
    {
        if (!await OwnsProjectAsync(ownerId, projectId))
            return ServiceResult.Fail(ServiceError.NotFound);

        var member = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.ProjectId == projectId);
        if (member is null) return ServiceResult.Fail(ServiceError.NotFound);

        _db.ProjectMembers.Remove(member);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<List<PendingInviteDto>> GetPendingInvitesAsync(int userId)
        => await _db.ProjectMembers
            .Where(m => m.UserId == userId && m.Status == MemberStatus.Pending)
            .Include(m => m.Project)
            .Include(m => m.InvitedBy)
            .Select(m => new PendingInviteDto(
                m.ProjectId,
                m.Project.Name,
                m.InvitedBy.Username,
                m.CreatedDate))
            .ToListAsync();

    public async Task<ServiceResult<List<ProjectMemberDto>>> GetMembersAsync(int userId, int projectId)
    {
        if (!await CanAccessProjectAsync(userId, projectId))
            return ServiceResult<List<ProjectMemberDto>>.Fail(ServiceError.NotFound);

        var members = await _db.ProjectMembers
            .Where(m => m.ProjectId == projectId)
            .Include(m => m.User)
            .Select(m => new ProjectMemberDto(
                m.Id,
                m.UserId,
                m.User.Username,
                m.Status.ToString(),
                m.CreatedDate))
            .ToListAsync();

        return ServiceResult<List<ProjectMemberDto>>.Ok(members);
    }
}
