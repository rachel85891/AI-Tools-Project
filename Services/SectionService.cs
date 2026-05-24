using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using Repositories;
using DTOs;
using Entities;

namespace Services
{
    public class SectionService : ISectionService
    {
        ISectionRepository _sectionRepository;
        IMapper _mapper;
        public SectionService(ISectionRepository sectionRepository, IMapper mapper)
        {
            _sectionRepository = sectionRepository;
            _mapper = mapper;
        }
        public async Task<List<SectionReadDTO>> getSectionsByShowId(int showId)
        {
            List<Section> sections = await _sectionRepository.getSectionsByShowId(showId);
            List<SectionReadDTO> sectionDTOs = _mapper.Map<List<Section>, List<SectionReadDTO>>(sections);
            return sectionDTOs;
        }

        public async Task<SectionReadDTO> addSection(SectionCreateDTO sectionCreateDTO)
        {
            Section section = _mapper.Map<SectionCreateDTO, Section>(sectionCreateDTO);
            section = await _sectionRepository.addSection(section);
            SectionReadDTO sectionReadDTO = _mapper.Map < Section, SectionReadDTO > (section);
            return sectionReadDTO;
        }
    }
}
