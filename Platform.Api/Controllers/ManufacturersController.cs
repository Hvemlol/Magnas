using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Api.DTOs;
using Platform.Api.Services;

namespace Platform.Api.Controllers;

[Route("api/manufacturers")]
public class ManufacturersController : ApiControllerBase
{
    private readonly IProfileService _profile;

    public ManufacturersController(IProfileService profile) => _profile = profile;

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProfile(int id)
        => Map(await _profile.GetManufacturerProfileAsync(id));

    [HttpPut("profile")]
    [Authorize(Roles = "Manufacturer")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateManufacturerProfileRequest req)
        => Map(await _profile.UpdateManufacturerProfileAsync(GetUserId(), req));
}
