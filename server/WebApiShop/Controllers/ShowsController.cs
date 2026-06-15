using DTOs;
using Microsoft.AspNetCore.Authorization;
using Entities;
using Microsoft.AspNetCore.Mvc;
using Services;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApiShop.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShowsController : ControllerBase
    {

        IShowService _showService;
        public ShowsController(IShowService showService)
        {
            _showService = showService;
        }

        ////GET: api/<ShowsController>
        //[HttpGet]
        //public async Task<ActionResult<List<ShowReadDTO>>> Get()
        //{
        //    List<ShowReadDTO> shows = await _showService.getAllShows();
        //    if (shows == null)
        //        return NoContent();
        //    return Ok(shows);
        //}

        // GET api/<ShowsController>/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ShowReadDTO>> Get(int id)
        {
            ShowReadDTO show = await _showService.getShowById(id);
            if (show == null)
                return NoContent();
            return Ok(show);
        }

        // POST api/<ShowsController>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ShowReadDTO>> Post([FromBody] ShowCreateDTO show, int userId)
        {
            ShowReadDTO createdShow = await _showService.addShow(show,userId);
            if (createdShow == null)
                return BadRequest();
            return CreatedAtAction(nameof(Get), new { createdShow.Id }, createdShow); ;
        }

        // PUT api/<ShowsController>/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ShowReadDTO>> Put(int id, [FromBody] ShowUpdateDTO show, int userId)
        {
            ShowReadDTO updatedShow = await _showService.updateShow(show, id, userId);
            if (updatedShow == null)
                return BadRequest();
            return Ok(updatedShow);
        }

        // DELETE api/<ShowsController>/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id, int userId)
        {
            var item = await _showService.getShowById(id);

            if (item == null)
            {
                return NotFound();
            }
            int? rowsAffected = await _showService.Delete(id, userId);
            if (rowsAffected == null)
                return Unauthorized();
            if (rowsAffected > 0)
            {
                return NoContent();
            }
            return BadRequest();
        }

        // GET: api/<ShowsController>
        //[HttpGet]
        //public async Task<ActionResult<(IEnumerable<ShowReadDTO> shows, int total)>> GetAll(string? description, int? minPrice, int? maxPrice, int skip, int position, [FromQuery] int[] categoryIdS, [FromQuery] string[] sectors, [FromQuery] string[] audiences)
        //{
        //    (IEnumerable<ShowReadDTO> shows, int total) shows = await _showService.getAllShows(description, minPrice, maxPrice, skip, position, categoryIdS, sectors, audiences);
        //    if (shows.shows == null)
        //        return NoContent();
        //    return Ok(shows.shows);
        //}
        [HttpGet]
        public async Task<ActionResult<(IEnumerable<ShowReadDTO> shows, int total)>> GetAll([FromQuery] ShowFilterDTO filters)
        {
            (IEnumerable<ShowReadDTO> shows, int total) shows = await _showService.getAllShows(filters);
            if (shows.shows == null)
                return NoContent();
            return Ok(shows.shows);
        }
    }
}
