using Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Repositories
{
    public class UserRepository : IUserRepository
    {
        ShowsCenterContext _context;
        public UserRepository(ShowsCenterContext ShowsCenterContext)
        {
            _context = ShowsCenterContext;
        }
        public async Task<User> getUserById(int id)
        {
            return await _context.Users.Include(c => c.Orders)
                .ThenInclude(d => d.OrderedSeats)
                .ThenInclude(o=>o.Show)
                .ThenInclude(o=>o.Sections)
                .AsSplitQuery()
                .FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<User> addUser(User user)
        {
           await _context.Users.AddAsync(user);
            try
            {
                await _context.SaveChangesAsync();
                return user;
            }
            catch(DbUpdateException ex)
            {
                return null;
            }
        }

        public async Task<User> UpdateUser(User userToUpdate)
        {
            _context.Users.Update(userToUpdate);
            await _context.SaveChangesAsync();
            return userToUpdate;

        }
        public async Task<User> Login(User user)
        {
            // Legacy login method matching on plain password (kept for compatibility/tests).
            return await _context.Users.FirstOrDefaultAsync(u => u.EmailAddress == user.EmailAddress && u.Password == user.Password);
        }

        public async Task<User> getUserByEmail(string email)
        {
            var normalized = email?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(normalized))
                return null;

            return await _context.Users.FirstOrDefaultAsync(u => u.EmailAddress.ToLower() == normalized);
        }
    }
}
