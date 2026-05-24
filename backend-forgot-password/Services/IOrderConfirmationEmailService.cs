using TimeBank.Api.DTOs;

namespace TimeBank.Api.Services;

public interface IOrderConfirmationEmailService
{
    Task<SendOrderConfirmationResult> SendAsync(SendOrderConfirmationRequest request, CancellationToken ct = default);
}

public record SendOrderConfirmationResult(bool Sent, string? Message = null);
