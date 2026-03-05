using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Api.DTOs;
using Platform.Api.Services;

namespace Platform.Api.Controllers;

[Route("api/projects")]
[Authorize(Roles = "Architect")]
public class ProjectsController : ApiControllerBase
{
    private readonly IProjectService _projects;

    public ProjectsController(IProjectService projects) => _projects = projects;

    // ── Invites (must be before /{id} routes) ────────────────────────────────

    [HttpGet("invites")]
    public async Task<IActionResult> GetPendingInvites()
        => Ok(await _projects.GetPendingInvitesAsync(GetUserId()));

    [HttpPost("invites/{projectId}/accept")]
    public async Task<IActionResult> AcceptInvite(int projectId)
        => Map(await _projects.AcceptInviteAsync(GetUserId(), projectId));

    [HttpDelete("invites/{projectId}")]
    public async Task<IActionResult> DeclineInvite(int projectId)
        => Map(await _projects.DeclineInviteAsync(GetUserId(), projectId));

    // ── Projects ──────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _projects.ListAsync(GetUserId()));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Map(await _projects.GetByIdAsync(GetUserId(), id));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProjectRequest req)
    {
        var dto = await _projects.CreateAsync(GetUserId(), req);
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ProjectRequest req)
        => Map(await _projects.UpdateAsync(GetUserId(), id, req));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
        => Map(await _projects.DeleteAsync(GetUserId(), id));

    [HttpPost("{id}/groups")]
    public async Task<IActionResult> AddGroup(int id, [FromBody] GroupRequest req)
        => Map(await _projects.AddGroupAsync(GetUserId(), id, req));

    [HttpPut("{id}/groups/{groupId}")]
    public async Task<IActionResult> UpdateGroup(int id, int groupId, [FromBody] GroupRequest req)
        => Map(await _projects.UpdateGroupAsync(GetUserId(), id, groupId, req));

    [HttpDelete("{id}/groups/{groupId}")]
    public async Task<IActionResult> DeleteGroup(int id, int groupId)
        => Map(await _projects.DeleteGroupAsync(GetUserId(), id, groupId));

    [HttpPost("{id}/products")]
    public async Task<IActionResult> AddProduct(int id, [FromBody] AddProductToProjectRequest req)
        => Map(await _projects.AddProductAsync(GetUserId(), id, req));

    [HttpPatch("{id}/products/{ppId}")]
    public async Task<IActionResult> UpdateProduct(int id, int ppId, [FromBody] UpdateProjectProductRequest req)
        => Map(await _projects.UpdateProductAsync(GetUserId(), id, ppId, req));

    [HttpDelete("{id}/products/{ppId}")]
    public async Task<IActionResult> RemoveProduct(int id, int ppId)
        => Map(await _projects.RemoveProductAsync(GetUserId(), id, ppId));

    [HttpPost("{id}/elements")]
    public async Task<IActionResult> AddElement(int id, [FromBody] AddElementToProjectRequest req)
        => Map(await _projects.AddElementAsync(GetUserId(), id, req));

    [HttpPatch("{id}/elements/{peId}")]
    public async Task<IActionResult> UpdateElement(int id, int peId, [FromBody] UpdateProjectProductRequest req)
        => Map(await _projects.UpdateElementAsync(GetUserId(), id, peId, req));

    [HttpDelete("{id}/elements/{peId}")]
    public async Task<IActionResult> RemoveElement(int id, int peId)
        => Map(await _projects.RemoveElementAsync(GetUserId(), id, peId));

    // ── Members ───────────────────────────────────────────────────────────────

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetMembers(int id)
        => Map(await _projects.GetMembersAsync(GetUserId(), id));

    [HttpPost("{id}/members")]
    public async Task<IActionResult> Invite(int id, [FromBody] InviteRequest req)
        => Map(await _projects.InviteAsync(GetUserId(), id, req));

    [HttpDelete("{id}/members/{memberId}")]
    public async Task<IActionResult> RemoveMember(int id, int memberId)
        => Map(await _projects.RemoveMemberAsync(GetUserId(), id, memberId));
}
