using Entities;

namespace Repositories
{
    public interface IUserRepository
    {
        Task<User> addUser(User user);
        Task<User> getUserById(int id);
        Task<User> getUserByEmail(string email);
        Task<User> UpdateUser(User userToUpdate);
        Task<User> Login(User loginUser);
    }
}