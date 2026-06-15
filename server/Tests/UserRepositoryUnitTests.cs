using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Entities;
using Moq;
using Moq.EntityFrameworkCore;
using Repositories;
using Xunit;
using Microsoft.EntityFrameworkCore;

namespace Tests
{
    public class UserRepositoryUnitTests
    {
        private Mock<ShowsCenterContext> GetMockContext<T>(List<T> data, Expression<System.Func<ShowsCenterContext, DbSet<T>>> dbSetSelector) where T : class
        {
            var mockContext = new Mock<ShowsCenterContext>();
            mockContext.Setup(dbSetSelector).ReturnsDbSet(data);
            return mockContext;
        }

        [Fact]
        public async Task Login_ValidCredentials_ReturnsUser()
        {
            var users = new List<User>
            {
                new User { Id = 1, EmailAddress = "u@test", Password = "secret", FirstName = "A", LastName = "B" }
            };

            var mockContext = GetMockContext(users, x => x.Users);
            var repo = new UserRepository(mockContext.Object);

            var loginUser = new User { EmailAddress = "u@test", Password = "secret" };

            var result = await repo.Login(loginUser);

            Assert.NotNull(result);
            Assert.Equal(1, result.Id);
            Assert.Equal("u@test", result.EmailAddress);
        }
    }
}
