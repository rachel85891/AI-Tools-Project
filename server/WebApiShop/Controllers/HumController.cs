using System.Security.Claims;
using DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Repositories;
using Services.HumTest;

namespace WebApiShop.Controllers;

[Route("api/[controller]")]
[ApiController]
public class HumController : ControllerBase
{
    private readonly ICommandHandler<AnalyzeHumCommand, HumSessionResponseDto> _analyzeHandler;
    private readonly ICommandHandler<GetSessionCommand, HumSessionResponseDto?> _getSessionHandler;
    private readonly IHumRepository _humRepo;

    public HumController(
        ICommandHandler<AnalyzeHumCommand, HumSessionResponseDto> analyzeHandler,
        ICommandHandler<GetSessionCommand, HumSessionResponseDto?> getSessionHandler,
        IHumRepository humRepo)
    {
        _analyzeHandler = analyzeHandler;
        _getSessionHandler = getSessionHandler;
        _humRepo = humRepo;
    }

    /// <summary>Submit audio for genre detection and show recommendations. Guests allowed.</summary>
    [HttpPost("analyze")]
    [EnableRateLimiting("StrictSlidingPolicy")]
    public async Task<ActionResult<HumSessionResponseDto>> Analyze(
        [FromBody] HumSessionCreateDto dto, CancellationToken ct)
    {
        var result = await _analyzeHandler.HandleAsync(new AnalyzeHumCommand(dto), ct);
        return Ok(result);
    }

    /// <summary>Get the result of a previously submitted hum session.</summary>
    [HttpGet("session/{id}")]
    public async Task<ActionResult<HumSessionResponseDto>> GetSession(Guid id, CancellationToken ct)
    {
        var result = await _getSessionHandler.HandleAsync(new GetSessionCommand(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Get paginated hum session history for the authenticated user.</summary>
    [HttpGet("history")]
    [Authorize]
    public async Task<ActionResult<List<HumSessionResponseDto>>> GetHistory(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var sessions = await _humRepo.GetUserSessionsAsync(userId, page, pageSize);
        if (sessions.Count == 0)
            return NoContent();

        var result = sessions
            .Select(s => new HumSessionResponseDto(
                s.Id,
                s.DetectedGenre,
                s.ConfidenceScore,
                new List<ShowSummaryDto>()))
            .ToList();

        return Ok(result);
    }
}
