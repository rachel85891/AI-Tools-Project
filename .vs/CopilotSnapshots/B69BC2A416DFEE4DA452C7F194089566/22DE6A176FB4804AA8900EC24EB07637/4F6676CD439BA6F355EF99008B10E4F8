using DTOs;
using Entities;

namespace Services
{
    public interface IUserService
    {
        Task<UserReadDTO> addUser(UserCreateDTO user);
        Task<UserReadDTO> getUserById(int id);
        Task<UserReadDTO> UpdateUser(UserUpdateDTO userToUpdate, int id);
        Task<UserReadDTO> Login(UserLoginDTO user);
    }
}