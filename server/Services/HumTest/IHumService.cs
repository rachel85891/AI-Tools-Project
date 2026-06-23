using DTOs;

namespace Services.HumTest;

public interface IHumService
{
    Task<HumSessionResponseDto> AnalyzeAndRecommendAsync(HumSessionCreateDto dto, CancellationToken ct = default);
}
