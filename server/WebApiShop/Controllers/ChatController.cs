using System.Security.Claims;
using DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Services.Chat;

namespace WebApiShop.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly ILogger<ChatController> _logger;

    public ChatController(IChatService chatService, ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    [HttpPost("send")]
    [EnableRateLimiting("ChatLimitPolicy")]
    public async Task<IActionResult> SendMessageAsync(
        [FromBody] ChatRequestDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { error = "Message cannot be empty." });

        string? userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var result = await _chatService.GetChatResponseAsync(request, userId, cancellationToken);
        return Ok(result);
    }
}
