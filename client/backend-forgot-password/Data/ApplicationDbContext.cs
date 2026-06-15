using Microsoft.EntityFrameworkCore;
using TimeBank.Api.Data.Entities;

namespace TimeBank.Api.Data;

/// <summary>
/// Your existing DbContext. Add: DbSet&lt;PasswordResetCode&gt; PasswordResetCodes
/// and ensure User entity has EmailAddress and Password (string) properties.
/// </summary>
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<PasswordResetCode> PasswordResetCodes { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<PasswordResetCode>().HasIndex(p => new { p.Email, p.Code });
    }
}
