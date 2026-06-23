using DTOs;

namespace Services.HumTest;

public class AudioValidationHandler : AudioValidationHandlerBase
{
    protected override Task ValidateAsync(HumSessionCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.AudioBase64))
            throw new ArgumentException("Audio data is required.");
        return Task.CompletedTask;
    }
}
