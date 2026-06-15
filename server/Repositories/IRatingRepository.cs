using Entities;

namespace Repositories
{
    public interface IRatingRepository
    {
        Task<Rating> AddRating(Rating newRating);
        Task<List<Rating>> GetAllRatings();
    }
}
