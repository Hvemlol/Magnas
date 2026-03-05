namespace Platform.Api.Services;

public enum ServiceError { NotFound, Conflict, Forbidden, Validation }

/// <summary>Generic result for service methods that return data.</summary>
public record ServiceResult<T>
{
    public T?           Data      { get; init; }
    public ServiceError? Error    { get; init; }
    public string?      Message   { get; init; }
    public bool         IsSuccess => Error is null;

    public static ServiceResult<T> Ok(T data)
        => new() { Data = data };

    public static ServiceResult<T> Fail(ServiceError err, string? msg = null)
        => new() { Error = err, Message = msg };
}

/// <summary>Non-generic result for void operations (delete, remove, etc.).</summary>
public record ServiceResult
{
    public ServiceError? Error   { get; init; }
    public string?       Message { get; init; }
    public bool          IsSuccess => Error is null;

    public static ServiceResult Ok()
        => new();

    public static ServiceResult Fail(ServiceError err, string? msg = null)
        => new() { Error = err, Message = msg };
}
