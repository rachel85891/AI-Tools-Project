using DTOs;

namespace Services.HumTest;

public class DurationCheckHandler : AudioValidationHandlerBase
{
    protected override Task ValidateAsync(HumSessionCreateDto dto)
    {
        if (dto.DurationSeconds <= 0 || dto.DurationSeconds > 300)
            throw new ArgumentOutOfRangeException(nameof(dto.DurationSeconds),
                "Duration must be greater than 0 and no more than 300 seconds.");
        return Task.CompletedTask;
    }
}
