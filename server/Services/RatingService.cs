using Repositories;
using Entities;
using System.Threading.Tasks;

namespace Services
{
    public class RatingService : IRatingService
    {
        private readonly IRatingRepository _ratingRepository;

        public RatingService(IRatingRepository ratingRepository)
        {
            _ratingRepository = ratingRepository;
        }

        public async Task<Rating> AddRating(Rating newRating)
        {
            return await _ratingRepository.AddRating(newRating);
        }

        public async Task<List<Rating>> GetAllRatings()
        {
            return await _ratingRepository.GetAllRatings();
        }
    }
}