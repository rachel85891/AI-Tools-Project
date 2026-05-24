using System;
using System.Data.Common;
using System.Threading.Tasks;
using Entities;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Repositories;
using Xunit;

namespace Tests
{
    public class UserRepositoryIntegrationTests : IAsyncLifetime, IDisposable
    {
        private DbConnection _connection;
        private ShowsCenterContext _context;
        private UserRepository _repository;

        public async Task InitializeAsync()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<ShowsCenterContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new ShowsCenterContext(options);
            await _context.Database.EnsureCreatedAsync();

            _repository = new UserRepository(_context);
        }

        public async Task DisposeAsync()
        {
            if (_context != null)
            {
                await _context.DisposeAsync();
            }
            if (_connection != null)
            {
                _connection.Close();
                _connection.Dispose();
            }
        }

        [Fact]
        public async Task AddUser_PersistsAndLogin_Works()
        {
            var user = new User
            {
                EmailAddress = $"int_{Guid.NewGuid():N}@test",
                Password = "p@ss",
                FirstName = "I",
                LastName = "T",
                PhoneNumber = "000"
            };

            var added = await _repository.addUser(user);

            Assert.NotNull(added);
            var fromDb = await _context.Users.FindAsync(added.Id);
            Assert.NotNull(fromDb);

            // now test login works
            var login = new User { EmailAddress = user.EmailAddress, Password = user.Password };
            var logged = await _repository.Login(login);
            Assert.NotNull(logged);
            Assert.Equal(user.EmailAddress, logged.EmailAddress);
        }

        public void Dispose()
        {
            _context?.Dispose();
            _connection?.Dispose();
        }
    }
}
