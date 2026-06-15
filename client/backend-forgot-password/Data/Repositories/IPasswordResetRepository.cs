namespace TimeBank.Api.Data.Repositories;

public interface IPasswordResetRepository
{
    Task SaveCodeAsync(string email, string code, DateTime expiresAt, CancellationToken ct = default);
    Task<bool> ValidateAndConsumeCodeAsync(string email, string code, CancellationToken ct = default);
    Task<bool> UpdateUserPasswordByEmailAsync(string email, string hashedPassword, CancellationToken ct = default);
    Task<bool> UserExistsByEmailAsync(string email, CancellationToken ct = default);
}
