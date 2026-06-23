using DTOs;

namespace Services.HumTest;

public abstract class AudioValidationHandlerBase
{
    private AudioValidationHandlerBase? _next;

    public AudioValidationHandlerBase SetNext(AudioValidationHandlerBase next)
    {
        _next = next;
        return next;
    }

    public async Task HandleAsync(HumSessionCreateDto dto)
    {
        await ValidateAsync(dto);
        if (_next is not null)
            await _next.HandleAsync(dto);
    }

    protected abstract Task ValidateAsync(HumSessionCreateDto dto);
}
