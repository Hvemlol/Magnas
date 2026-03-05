using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Api.DTOs;
using Platform.Api.Services;

namespace Platform.Api.Controllers;

[Route("api/elements")]
[Authorize(Roles = "Architect")]
public class ElementsController : ApiControllerBase
{
    private readonly IElementService _elements;

    public ElementsController(IElementService elements) => _elements = elements;

    [HttpGet]
    public async Task<IActionResult> List()
        => Ok(await _elements.ListAsync(GetUserId()));

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
        => Map(await _elements.GetByIdAsync(GetUserId(), id));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ElementRequest req)
    {
        var dto = await _elements.CreateAsync(GetUserId(), req);
        return CreatedAtAction(nameof(Get), new { id = dto.Id }, dto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ElementRequest req)
        => Map(await _elements.UpdateAsync(GetUserId(), id, req));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
        => Map(await _elements.DeleteAsync(GetUserId(), id));

    [HttpPost("{id}/products")]
    public async Task<IActionResult> AddProduct(int id, [FromBody] AddProductToElementRequest req)
        => Map(await _elements.AddProductAsync(GetUserId(), id, req));

    [HttpDelete("{id}/products/{epId}")]
    public async Task<IActionResult> RemoveProduct(int id, int epId)
        => Map(await _elements.RemoveProductAsync(GetUserId(), id, epId));
}
