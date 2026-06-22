namespace DTOs;

public enum ChatResponseStatus { Success, Fallback, Failure }

public record ChatResponseDto(string Response, DateTime Timestamp, ChatResponseStatus Status);
