using Microsoft.AspNetCore.Mvc;
using TimeBank.Api.DTOs;
using TimeBank.Api.Services;

namespace TimeBank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IForgotPasswordService _forgotPassword;
    private readonly IOrderConfirmationEmailService _orderConfirmationEmail;

    public UsersController(
        IForgotPasswordService forgotPassword,
        IOrderConfirmationEmailService orderConfirmationEmail)
    {
        _forgotPassword = forgotPassword;
        _orderConfirmationEmail = orderConfirmationEmail;
    }

    /// <summary>
    /// Request a password-reset code sent to the user's email.
    /// POST /api/Users/forgot-password
    /// Body: { "email": "user@example.com" }
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<ActionResult<ForgotPasswordResponse>> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        var result = await _forgotPassword.RequestCodeAsync(request.Email ?? "", ct);
        return Ok(new ForgotPasswordResponse { Sent = result.Sent, Message = result.Message });
    }

    /// <summary>
    /// Reset password using the code received by email.
    /// POST /api/Users/reset-password
    /// Body: { "email": "...", "code": "123456", "newPassword": "..." }
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<ActionResult<ResetPasswordResponse>> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        var result = await _forgotPassword.ResetPasswordAsync(
            request.Email ?? "",
            request.Code ?? "",
            request.NewPassword ?? "",
            ct);
        return Ok(new ResetPasswordResponse { Success = result.Success, Message = result.Message });
    }

    /// <summary>
    /// Send order confirmation email after checkout.
    /// POST /api/Users/send-order-confirmation
    /// </summary>
    [HttpPost("send-order-confirmation")]
    public async Task<ActionResult<SendOrderConfirmationResponse>> SendOrderConfirmation(
        [FromBody] SendOrderConfirmationRequest request,
        CancellationToken ct)
    {
        var result = await _orderConfirmationEmail.SendAsync(request, ct);
        return Ok(new SendOrderConfirmationResponse
        {
            Sent = result.Sent,
            Message = result.Message
        });
    }
}
