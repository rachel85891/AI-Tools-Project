using Entities;

namespace Repositories;

public interface IHumRepository
{
    Task<HumSession> SaveSessionAsync(HumSession session);
    Task<HumSession?> GetSessionByIdAsync(Guid id);
    Task<HumSession> UpdateSessionAsync(HumSession session);
    Task<List<HumSession>> GetUserSessionsAsync(string userId, int page, int pageSize);
}
