using DTOs;
using Entities;

namespace Services.HumTest;

public interface IHumEventObserver
{
    Task OnAnalysisCompletedAsync(HumSession session, GenreAnalysisDto analysis, CancellationToken ct = default);
}
