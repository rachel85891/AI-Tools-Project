using DTOs;

namespace Services.HumTest;

public class FormatCheckHandler : AudioValidationHandlerBase
{
    protected override Task ValidateAsync(HumSessionCreateDto dto)
    {
        try
        {
            Convert.FromBase64String(dto.AudioBase64);
        }
        catch (FormatException)
        {
            throw new ArgumentException("AudioBase64 is not valid base-64 encoded data.");
        }
        return Task.CompletedTask;
    }
}
