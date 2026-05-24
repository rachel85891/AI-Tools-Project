using System.Threading.Tasks;
using AutoMapper;
using DTOs;
using Entities;
using Microsoft.AspNetCore.Mvc;
using Services;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApiShop.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProviderController : ControllerBase
    {
        IProviderService _providerService;
        IMapper _mapper;
        public ProviderController(IProviderService providerService, IMapper mapper)
        {
            _providerService = providerService;
            _mapper = mapper;
        }

        // GET: api/<ProviderController>
        [HttpGet]
        public async Task<ActionResult<List<ProviderReadDTO>>> Get()
        {
            List<ProviderReadDTO> providers = await _providerService.getAllProviders();
            if (providers == null /*|| providers.Count == 0*/)
                return NoContent();
            return Ok(providers);
        }

        // GET api/<ProviderController>/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ProviderReadDTO>> Get(int id)
        {
            ProviderReadDTO provider = await _providerService.getProviderById(id);
            if (provider == null)
                return NoContent();
            return Ok(provider);
        }

        // POST api/<ProviderController>
        [HttpPost]
        public async Task<ActionResult<ProviderReadDTO>> Post([FromBody] ProviderCreateDTO provider, int userId)
        {
            ProviderReadDTO? createdProvider = await _providerService.addProvider(provider, userId);
            if (createdProvider == null)
                return BadRequest();
            return CreatedAtAction(nameof(Get), new { id = createdProvider.Id }, createdProvider);
        }

        //// PUT api/<ProviderController>/5
        //[HttpPut("{id}")]
        //public void Put(int id, [FromBody] string value)
        //{
        //}

        // DELETE api/<ProviderController>/5
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id, int userId)
        {
            bool deleted = await _providerService.deleteProvider(id, userId);
            if (!deleted)
                return BadRequest();
            return NoContent();
        }
    }
}