using Services;
using Xunit;

namespace Tests
{
    public class PasswordServiceTests
    {
        private readonly IPasswordService _service = new PasswordService();

        [Fact]
        public void HashPassword_IsNotPlainText()
        {
            var password = "my-secret-password";
            var hash = _service.HashPassword(password);
            Assert.NotNull(hash);
            Assert.NotEqual(password, hash);
        }

        [Fact]
        public void VerifyPassword_CorrectPassword_ReturnsTrue()
        {
            var password = "another-pass";
            var hash = _service.HashPassword(password);
            var ok = _service.VerifyPassword(password, hash);
            Assert.True(ok);
        }

        [Fact]
        public void VerifyPassword_IncorrectPassword_ReturnsFalse()
        {
            var password = "right-pass";
            var hash = _service.HashPassword(password);
            var ok = _service.VerifyPassword("wrong-pass", hash);
            Assert.False(ok);
        }
    }
}
