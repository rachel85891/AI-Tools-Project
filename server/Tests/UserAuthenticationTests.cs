using System.Net.Http.Json;
using Xunit;
using Microsoft.EntityFrameworkCore;
using Entities;
using Repositories;
using Services;
using DTOs;

namespace Tests
{
    public class UserAuthenticationTests
    {
        [Fact]
        public async Task Register_SavesHashedPassword_AndLoginSucceeds()
        {
            // Arrange: create in-memory sqlite context
            using var connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:");
            connection.Open();

            var options = new DbContextOptionsBuilder<ShowsCenterContext>()
                .UseSqlite(connection)
                .Options;

            await using var db = new ShowsCenterContext(options);
            await db.Database.EnsureCreatedAsync();

            var repo = new UserRepository(db);
            var passService = new PasswordService();

            // Act: register user (simulate service behavior)
            var dto = new UserCreateDTO("T", "U", "int_test@example.com", "000000000", "my-secret-123");
            var user = new User
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                EmailAddress = dto.EmailAddress,
                PhoneNumber = dto.PhoneNumber,
                Password = passService.HashPassword(dto.Password)
            };

            var added = await repo.addUser(user);
            Assert.NotNull(added);

            // Assert: stored password is hashed and not plaintext
            var fromDb = await repo.getUserByEmail(dto.EmailAddress);
            Assert.NotNull(fromDb);
            Assert.NotEqual(dto.Password, fromDb.Password);
            Assert.StartsWith("$2", fromDb.Password);

            // Verify login (password verification)
            var verified = passService.VerifyPassword(dto.Password, fromDb.Password);
            Assert.True(verified);
        }
    }
}
