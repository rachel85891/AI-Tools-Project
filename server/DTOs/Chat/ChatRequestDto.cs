namespace DTOs;

public record ChatMessageDto(string Role, string Content);

public record ChatRequestDto(string Message, List<ChatMessageDto>? Context = null);
