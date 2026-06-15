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
            return await _context.Users.Include(c => c.Orders).ThenInclude(d => d.OrderedSeats).ThenInclude(o=>o.Show).ThenInclude(o=>o.Sections)
                                        .FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<User> addUser(User user)
        {
            
           await _context.Users.AddAsync(user);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch(DbUpdateException ex)
            {
                return null;
            }
            if (getUserById(user.Id) != null)
                return user;
            else
                return null;

        }

        public async Task<User> UpdateUser(User userToUpdate)
        {
            _context.Users.Update(userToUpdate);
            await _context.SaveChangesAsync();
            return userToUpdate;

        }
        public async Task<User> Login(User user)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.EmailAddress == user.EmailAddress && u.Password == user.Password);
        }
    }
}
