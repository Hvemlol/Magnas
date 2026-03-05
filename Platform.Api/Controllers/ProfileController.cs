using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Api.DTOs;
using Platform.Api.Services;

namespace Platform.Api.Controllers;

[Route("api/profile")]
[Authorize(Roles = "Architect")]
public class ProfileController : ApiControllerBase
{
    private readonly IProfileService _profile;

    public ProfileController(IProfileService profile) => _profile = profile;

    [HttpGet]
    public async Task<IActionResult> Get()
        => Map(await _profile.GetArchitectProfileAsync(GetUserId()));

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] ArchitectProfileUpdateRequest req)
        => Map(await _profile.UpdateArchitectProfileAsync(GetUserId(), req));
}
