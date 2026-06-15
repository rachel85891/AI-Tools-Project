using DTOs;

namespace Services
{
    public interface ISectionService
    {
        Task<SectionReadDTO> addSection(SectionCreateDTO sectionCreateDTO);
        Task<List<SectionReadDTO>> getSectionsByShowId(int showId);
    }
}