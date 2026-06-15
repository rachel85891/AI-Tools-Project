using AutoMapper;
using DTOs;
using Entities;
using MediaBrowser.Model.Logging;
using Microsoft.Extensions.Logging;
using Repositories;
using System.Text.Json;
using Zxcvbn;
namespace Services
{
    public class UserService : IUserService
    {
        IPasswordService _passService;
        IUserRepository _repository;
        IMapper _mapper;
        public UserService(IPasswordService passService, IUserRepository repository, IMapper mapper)
        {
            _passService = passService;
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<UserReadDTO> getUserById(int id)
        {
            User user = await _repository.getUserById(id);
            UserReadDTO userDTO = _mapper.Map<User, UserReadDTO>(user);
            return userDTO;
        }

        public async Task<UserReadDTO> addUser(UserCreateDTO user)
        {
            if (_passService.getStrengthByPassword(user.Password).Strength < 2)
                return null;
            User newUser = _mapper.Map<UserCreateDTO, User>(user);
            newUser = await _repository.addUser(newUser);
            UserReadDTO userDTO = _mapper.Map<User, UserReadDTO>(newUser);
            return userDTO;
        }

        public async Task<UserReadDTO> UpdateUser(UserUpdateDTO userToUpdate, int id)
        {
            if(userToUpdate.Password!="")
                if (_passService.getStrengthByPassword(userToUpdate.Password).Strength < 2)
                    return null;
            User user = _mapper.Map<UserUpdateDTO, User>(userToUpdate);
            user.Id = id;
            user = await _repository.UpdateUser(user);
            UserReadDTO userDTO = _mapper.Map<User, UserReadDTO>(user);
            return userDTO;
        }
        public async Task<UserReadDTO> Login(UserLoginDTO user)
        {
            User loginUser = _mapper.Map<UserLoginDTO, User>(user);
            loginUser = await _repository.Login(loginUser);
            UserReadDTO logged = _mapper.Map<User, UserReadDTO>(loginUser);

            return logged;
        }

    }
}
