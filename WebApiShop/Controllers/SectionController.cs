using AutoMapper;
using DTOs;
using Entities;
using Microsoft.AspNetCore.Mvc;
using Services;
using Microsoft.AspNetCore.Authorization;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApiShop.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SectionController : ControllerBase
    {
        ISectionService _sectionService;
        IMapper _mapper;
        public SectionController(ISectionService sectionService, IMapper mapper)
        {
            _sectionService = sectionService;
            _mapper = mapper;
        }


        //// GET: api/<SectionController>
        //[HttpGet]
        //public IEnumerable<string> Get()
        //{
        //    return new string[] { "value1", "value2" };
        //}

        // GET api/<SectionController>/5
        [HttpGet("{id}")]
        public async Task<ActionResult<List<SectionReadDTO>>> Get(int id)
        {
            List<SectionReadDTO> sections = await _sectionService.getSectionsByShowId(id);
            if(sections == null)
            {
                return NoContent();
            }
            return Ok(sections);
        }

        //POST api/<SectionController>
        [HttpPost]
        public async Task<ActionResult<SectionReadDTO>> Post([FromBody] SectionCreateDTO section)
        {
            SectionReadDTO newSection = await _sectionService.addSection(section);
            if (newSection == null)
                return BadRequest();
            return CreatedAtAction(nameof(Get), new { newSection.Id }, newSection);
        }

        //// PUT api/<SectionController>/5
        //[HttpPut("{id}")]
        //public void Put(int id, [FromBody] string value)
        //{
        //}

        //// DELETE api/<SectionController>/5
        //[HttpDelete("{id}")]
        //public void Delete(int id)
        //{
        //}
    }
}
