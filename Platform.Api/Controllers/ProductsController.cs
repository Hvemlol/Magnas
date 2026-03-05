using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Api.DTOs;
using Platform.Api.Services;

namespace Platform.Api.Controllers;

[Route("api/products")]
public class ProductsController : ApiControllerBase
{
    private readonly IProductService _products;

    public ProductsController(IProductService products) => _products = products;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? category)
        => Ok(await _products.GetPublishedAsync(search, category));

    [HttpGet("mine")]
    [Authorize(Roles = "Manufacturer")]
    public async Task<IActionResult> GetMine()
        => Ok(await _products.GetByManufacturerAsync(GetUserId()));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
        => Map(await _products.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = "Manufacturer")]
    public async Task<IActionResult> Create([FromBody] ProductRequest request)
    {
        var result = await _products.CreateAsync(GetUserId(), request);
        if (!result.IsSuccess) return Map(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Manufacturer")]
    public async Task<IActionResult> Update(int id, [FromBody] ProductRequest request)
        => Map(await _products.UpdateAsync(GetUserId(), id, request));

    [HttpPatch("{id}/publish")]
    [Authorize(Roles = "Manufacturer")]
    public async Task<IActionResult> TogglePublish(int id)
        => Map(await _products.TogglePublishAsync(GetUserId(), id));

    [HttpDelete("{id}")]
    [Authorize(Roles = "Manufacturer")]
    public async Task<IActionResult> Delete(int id)
        => Map(await _products.DeleteAsync(GetUserId(), id));
}
