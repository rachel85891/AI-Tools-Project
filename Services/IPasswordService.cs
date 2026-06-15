using Entities;

namespace Services
{
    public interface IPasswordService
    {
        PasswordEntity getStrengthByPassword(string password);
        string HashPassword(string password);
        bool VerifyPassword(string password, string hashedPassword);
    }
}