using Microsoft.EntityFrameworkCore;
using TimeBank.Api.Data;
using TimeBank.Api.Data.Entities;

namespace TimeBank.Api.Data.Repositories;

public class PasswordResetRepository : IPasswordResetRepository
{
    private readonly ApplicationDbContext _db;

    public PasswordResetRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task SaveCodeAsync(string email, string code, DateTime expiresAt, CancellationToken ct = default)
    {
        await _db.PasswordResetCodes.AddAsync(new PasswordResetCode
        {
            Email = email.Trim().ToLowerInvariant(),
            Code = code,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow
        }, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<bool> ValidateAndConsumeCodeAsync(string email, string code, CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var entity = await _db.PasswordResetCodes
            .FirstOrDefaultAsync(x => x.Email == normalizedEmail && x.Code == code && x.ExpiresAt > DateTime.UtcNow, ct);
        if (entity == null)
            return false;
        _db.PasswordResetCodes.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> UpdateUserPasswordByEmailAsync(string email, string hashedPassword, CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.EmailAddress == normalizedEmail, ct);
        if (user == null)
            return false;
        user.Password = hashedPassword;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> UserExistsByEmailAsync(string email, CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        return await _db.Users.AnyAsync(u => u.EmailAddress == normalizedEmail, ct);
    }
}
