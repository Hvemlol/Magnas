using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using Platform.Api.Services;

namespace Platform.Api.Controllers;

[ApiController]
[TypeFilter(typeof(ClaimExceptionFilter))]
public abstract class ApiControllerBase : ControllerBase
{
    protected int GetUserId()
    {
        var claim = User.FindFirst("userId");
        if (claim is null || !int.TryParse(claim.Value, out var id))
            throw new UnauthorizedAccessException();
        return id;
    }

    protected IActionResult Map<T>(ServiceResult<T> r) =>
        r.IsSuccess ? Ok(r.Data) : MapErr(r.Error, r.Message);

    protected IActionResult Map(ServiceResult r) =>
        r.IsSuccess ? NoContent() : MapErr(r.Error, r.Message);

    private IActionResult MapErr(ServiceError? e, string? msg) => e switch
    {
        ServiceError.NotFound  => NotFound(msg is not null ? (object)new { error = msg } : null),
        ServiceError.Conflict  => Conflict(new { error = msg }),
        ServiceError.Forbidden => Forbid(),
        _                      => StatusCode(500)
    };
}

public class ClaimExceptionFilter : IExceptionFilter
{
    private readonly ILogger<ClaimExceptionFilter> _logger;

    public ClaimExceptionFilter(ILogger<ClaimExceptionFilter> logger) => _logger = logger;

    public void OnException(ExceptionContext context)
    {
        if (context.Exception is UnauthorizedAccessException)
        {
            _logger.LogWarning("userId claim missing or malformed — {Method} {Path}",
                context.HttpContext.Request.Method,
                context.HttpContext.Request.Path);
            context.Result = new UnauthorizedResult();
            context.ExceptionHandled = true;
        }
    }
}
