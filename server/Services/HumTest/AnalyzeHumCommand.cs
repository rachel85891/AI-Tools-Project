using DTOs;

namespace Services.HumTest;

public record AnalyzeHumCommand(HumSessionCreateDto Dto);

public class AnalyzeHumCommandHandler : ICommandHandler<AnalyzeHumCommand, HumSessionResponseDto>
{
    private readonly IHumService _humService;

    public AnalyzeHumCommandHandler(IHumService humService)
    {
        _humService = humService;
    }

    public Task<HumSessionResponseDto> HandleAsync(AnalyzeHumCommand command, CancellationToken ct = default)
        => _humService.AnalyzeAndRecommendAsync(command.Dto, ct);
}
