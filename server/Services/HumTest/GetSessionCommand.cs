using DTOs;
using Microsoft.Extensions.Caching.Hybrid;
using Repositories;

namespace Services.HumTest;

public record GetSessionCommand(Guid SessionId);

public class GetSessionCommandHandler : ICommandHandler<GetSessionCommand, HumSessionResponseDto?>
{
    private readonly IHumRepository _humRepo;
    private readonly HybridCache _cache;

    public GetSessionCommandHandler(IHumRepository humRepo, HybridCache cache)
    {
        _humRepo = humRepo;
        _cache = cache;
    }

    public async Task<HumSessionResponseDto?> HandleAsync(GetSessionCommand command, CancellationToken ct = default)
    {
        return await _cache.GetOrCreateAsync<HumSessionResponseDto?>(
            "hum:" + command.SessionId,
            async _ =>
            {
                var session = await _humRepo.GetSessionByIdAsync(command.SessionId);
                if (session is null) return null;
                return new HumSessionResponseDto(
                    session.Id,
                    session.DetectedGenre,
                    session.ConfidenceScore,
                    new List<ShowSummaryDto>());
            },
            new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(5) },
            cancellationToken: ct);
    }
}
