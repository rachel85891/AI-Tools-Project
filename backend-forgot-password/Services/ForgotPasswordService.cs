using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using TimeBank.Api.Data.Repositories;

namespace TimeBank.Api.Services;

public class ForgotPasswordServiceOptions
{
    public const string SectionName = "PasswordReset";
    public int CodeExpirationMinutes { get; set; } = 15;
    public int CodeLength { get; set; } = 6;
}

public class ForgotPasswordService : IForgotPasswordService
{
    private readonly IPasswordResetRepository _repo;
    private readonly IEmailSender _email;
    private readonly ForgotPasswordServiceOptions _options;

    public ForgotPasswordService(
        IPasswordResetRepository repo,
        IEmailSender email,
        IOptions<ForgotPasswordServiceOptions> options)
    {
        _repo = repo;
        _email = email;
        _options = options.Value;
    }

    public async Task<ForgotPasswordResult> RequestCodeAsync(string email, CancellationToken ct = default)
    {
        var normalized = email?.Trim();
        if (string.IsNullOrEmpty(normalized))
            return new ForgotPasswordResult(false, "Email is required.");

        var exists = await _repo.UserExistsByEmailAsync(normalized, ct);
        if (!exists)
            return new ForgotPasswordResult(false, "No account found for this email.");

        var code = GenerateNumericCode(_options.CodeLength);
        var expiresAt = DateTime.UtcNow.AddMinutes(_options.CodeExpirationMinutes);
        await _repo.SaveCodeAsync(normalized, code, expiresAt, ct);

        var subject = "קוד איפוס סיסמה - TimeBank";
        var body = $@"
<div dir=""rtl"" style=""font-family: Arial; font-size: 16px;"">
  <p>שלום,</p>
  <p>קיבלת בקשה לאיפוס סיסמה. הקוד שלך הוא:</p>
  <p style=""font-size: 24px; font-weight: bold; letter-spacing: 4px;"">{code}</p>
  <p>הקוד תקף ל-{_options.CodeExpirationMinutes} דקות.</p>
  <p>אם לא ביקשת איפוס סיסמה, התעלם מהמייל.</p>
</div>";
        try
        {
            await _email.SendAsync(normalized, subject, body, ct);
        }
        catch (Exception)
        {
            return new ForgotPasswordResult(false, "Failed to send email. Please try again later.");
        }

        return new ForgotPasswordResult(true);
    }

    public async Task<ResetPasswordResult> ResetPasswordAsync(string email, string code, string newPassword, CancellationToken ct = default)
    {
        var normalizedEmail = email?.Trim();
        var normalizedCode = code?.Trim();
        if (string.IsNullOrEmpty(normalizedEmail) || string.IsNullOrEmpty(normalizedCode))
            return new ResetPasswordResult(false, "Email and code are required.");
        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 4)
            return new ResetPasswordResult(false, "Password must be at least 4 characters.");

        var valid = await _repo.ValidateAndConsumeCodeAsync(normalizedEmail, normalizedCode, ct);
        if (!valid)
            return new ResetPasswordResult(false, "Invalid or expired code.");

        var hashed = HashPassword(newPassword);
        var updated = await _repo.UpdateUserPasswordByEmailAsync(normalizedEmail, hashed, ct);
        if (!updated)
            return new ResetPasswordResult(false, "User not found.");

        return new ResetPasswordResult(true);
    }

    private static string GenerateNumericCode(int length)
    {
        var bytes = new byte[length * 2];
        RandomNumberGenerator.Fill(bytes);
        var sb = new System.Text.StringBuilder(length);
        for (var i = 0; i < length; i++)
            sb.Append((bytes[i * 2] % 10).ToString());
        return sb.ToString();
    }

    private static string HashPassword(string password)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(password);
        var hash = SHA256.HashData(bytes);
        return Convert.ToBase64String(hash);
    }
}
