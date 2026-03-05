using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Api.DTOs;
using Platform.Api.Services;

namespace Platform.Api.Controllers;

[Route("api/saved")]
[Authorize(Roles = "Architect")]
public class SavedController : ApiControllerBase
{
    private readonly ISavedProductService _saved;

    public SavedController(ISavedProductService saved) => _saved = saved;

    [HttpGet]
    public async Task<IActionResult> GetSaved()
        => Ok(await _saved.GetByArchitectAsync(GetUserId()));

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveRequest request)
        => Map(await _saved.SaveAsync(GetUserId(), request));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Unsave(int id)
        => Map(await _saved.UnsaveAsync(GetUserId(), id));
}
