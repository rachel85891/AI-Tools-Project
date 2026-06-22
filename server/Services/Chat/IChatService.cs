using DTOs;

namespace Services.Chat;

public interface IChatService
{
    Task<ChatResponseDto> GetChatResponseAsync(
        ChatRequestDto request,
        string? userId,
        CancellationToken cancellationToken);
}
