using Entities;

namespace Services
{
    public interface IRatingService
    {
        Task<Rating> AddRating(Rating newRating);
        Task<List<Rating>> GetAllRatings();
    }
}