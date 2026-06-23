using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repositories;

public class HumRepository : IHumRepository
{
    private readonly ShowsCenterContext _context;

    public HumRepository(ShowsCenterContext context)
    {
        _context = context;
    }

    public async Task<HumSession> SaveSessionAsync(HumSession session)
    {
        await _context.HumSessions.AddAsync(session);
        await _context.SaveChangesAsync();
        return session;
    }

    public async Task<HumSession> UpdateSessionAsync(HumSession session)
    {
        _context.HumSessions.Update(session);
        await _context.SaveChangesAsync();
        return session;
    }

    public async Task<HumSession?> GetSessionByIdAsync(Guid id)
    {
        return await _context.HumSessions.FindAsync(id);
    }

    public async Task<List<HumSession>> GetUserSessionsAsync(string userId, int page, int pageSize)
    {
        return await _context.HumSessions
            .Where(h => h.UserId == userId)
            .OrderByDescending(h => h.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();
    }
}
