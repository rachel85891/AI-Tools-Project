using Entities;
using DTOs;

namespace Repositories
{
    public interface IShowsRepository
    {
        Task<Show> addShow(Show show);
        Task<int> Delete(int id);
        Task<List<Show>> getAllShows();
        Task<(IEnumerable<Show> shows, int total)> getAllShows(ShowFilterDTO filters);
        Task<Show> getShowById(int id);
        Task<Show> updateOrder(Show show, int id);
    }
}