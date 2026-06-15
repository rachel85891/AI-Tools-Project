using DTOs;

namespace Services
{
    public interface IShowService
    {
        Task<ShowReadDTO?> addShow(ShowCreateDTO showCDTO, int userId);
        Task<int?> Delete(int id, int userId);
        Task<List<ShowReadDTO>> getAllShows();
        Task<(IEnumerable<ShowReadDTO> shows, int total)> getAllShows(ShowFilterDTO filters);
        Task<ShowReadDTO> getShowById(int id);
        Task<ShowReadDTO?> updateShow(ShowUpdateDTO showUDTO, int id, int userId);
    }
}