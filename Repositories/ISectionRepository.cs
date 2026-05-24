using Entities;

namespace Repositories
{
    public interface ISectionRepository
    {
        Task<Section> addSection(Section section);
        Task<List<Section>> getSectionsByShowId(int showId);
    }
}