using AutoMapper;
using DTOs;
using Entities;
using MediaBrowser.Model.Logging;
using Microsoft.Extensions.Logging;
using Repositories;
using System.Text.Json;
using Zxcvbn;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
namespace Services
{
    public class UserService : IUserService
    {
        IPasswordService _passService;
        IUserRepository _repository;
        IMapper _mapper;
        IAuth _auth;
        IConfiguration _config;
        public UserService(IPasswordService passService, IUserRepository repository, IMapper mapper, IAuth auth, IConfiguration config)
        {
            _passService = passService;
            _repository = repository;
            _mapper = mapper;
            _auth = auth;
            _config = config;
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
            // Hash the password before saving so plain password is never stored
            newUser.Password = _passService.HashPassword(user.Password);
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
            // If password provided, hash it before updating
            if (!string.IsNullOrEmpty(userToUpdate.Password))
            {
                user.Password = _passService.HashPassword(userToUpdate.Password);
            }
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

        public async Task<string> GenerateJwtToken(User user)
        {
            if (user == null) return string.Empty;

            // Read settings from configuration
            var secret = _config["JwtSettings:SecretKey"] ?? string.Empty;
            var issuer = _config["JwtSettings:Issuer"] ?? string.Empty;
            var audience = _config["JwtSettings:Audience"] ?? string.Empty;

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.EmailAddress ?? string.Empty)
            };

            // determine role (Admin/User)
            var isManager = false;
            try
            {
                if (_auth != null)
                    isManager = await _auth.IsManager(user.Id);
            }
            catch
            {
                // ignore and treat as regular user
                isManager = false;
            }
            var role = isManager ? "Admin" : "User";
            claims.Add(new Claim(ClaimTypes.Role, role));

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

    }
}
