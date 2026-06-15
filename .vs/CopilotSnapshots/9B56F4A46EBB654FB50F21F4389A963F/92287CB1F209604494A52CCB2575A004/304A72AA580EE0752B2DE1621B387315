using Entities;
using Microsoft.EntityFrameworkCore;
using Repositories;
using System;
using System.Threading.Tasks;
using Xunit;

namespace Tests
{
    public class UserRepositoryIntegrationTests : IClassFixture<DatabaseFixture>, IDisposable, IAsyncLifetime
    {
        private readonly ShowsCenterContext _context;
        private readonly UserRepository _repository;
        private readonly DatabaseFixture _fixture;

        public UserRepositoryIntegrationTests(DatabaseFixture fixture)
        {
            _fixture = fixture ?? throw new ArgumentNullException(nameof(fixture));
            _context = fixture.Context;
            _repository = new UserRepository(_context);
        }

        // Tear-up: runs before each test (async)
        public Task InitializeAsync()
        {
            // Ensure a clean database for each test
            _context.Database.CloseConnection();
            _context.Database.EnsureDeleted();
            _context.Database.EnsureCreated();

            return Task.CompletedTask;
        }

        // Tear-down: runs after each test (async)
        public Task DisposeAsync()
        {
            // Optionally perform async cleanup. main cleanup retained in Dispose().
            return Task.CompletedTask;
        }

        #region Happy Paths

        [Fact]
        public async Task RegisterAsync_ShouldSaveUserToRealDatabase()
        {
            // Arrange
            var user = new User { UserName = "integration@test.com", Password = "123", FirstName = "Test", LastName = "User" };

            // Act
            var result = await _repository.addUser(user);

            // Assert
            var userInDb = await _context.Users.FindAsync(result.Id);
            Assert.NotNull(userInDb);
            Assert.Equal("integration@test.com", userInDb.UserName);
        }

        //[Fact]
        //public async Task LoginAsync_ValidCredentials_ReturnsUserFromDb()
        //{
        //    // Arrange
        //    var user = new User { UserName = "login@integration.com", Password = "password123", FirstName = "A", LastName = "B", Phone = "0" };
        //    await _context.Users.AddAsync(user);
        //    await _context.SaveChangesAsync();
        //
        //    // Act
        //    var result = await _repository.LoginAsync("login@integration.com", "password123");
        //
        //    // Assert
        //    Assert.NotNull(result);
        //    Assert.Equal("login@integration.com", result.Email);
        //}

        #endregion

        #region Unhappy Paths

        [Fact]
        public async Task GetByIdAsync_WhenUserDoesNotExist_ReturnsNull()
        {
            // Act
            var result = await _repository.getUserById(999);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task UpdateAsync_ShouldUpdateUserSuccessfully()
        {
            // Arrange
            var user = new User { UserName = "old@test.com", Password = "123", FirstName = "Old", LastName = "Name" };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            _context.Entry(user).State = EntityState.Detached;

            // Act
            user.FirstName = "NewName";
            var result = await _repository.UpdateUser(user);

            // Assert
            var updatedUser = await _context.Users.FindAsync(user.Id);
            Assert.NotNull(updatedUser);
            // Use the null-forgiving operator after asserting not null so the static analyzer won't warn.
            Assert.Equal("NewName", updatedUser!.FirstName);
        }

        #endregion

        public void Dispose()
        {
            _context.Database.CloseConnection();
            _context.Database.EnsureDeleted();
        }
    }
}