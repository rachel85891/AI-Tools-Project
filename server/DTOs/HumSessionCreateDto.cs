namespace DTOs;

public record HumSessionCreateDto(string AudioBase64, double DurationSeconds, string? UserId);
