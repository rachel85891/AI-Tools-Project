using Entities;

namespace Services
{
    public interface IPasswordService
    {
        PasswordEntity getStrengthByPassword(string password);
    }
}