using DTOs;
using Microsoft.AspNetCore.Mvc;
using Services;
using Microsoft.AspNetCore.Authorization;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApiShop.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrderedSeatController : ControllerBase
    {
            IOrderService _service;

            public OrderedSeatController(IOrderService service)
            {
                _service = service;
            }

            // GET: api/<OrderedSeatController>
            [HttpGet("showId/{showId}")]
            public async Task<ActionResult<List<OrderedSeatReadDTO>>> GetForShow(int showId)
            {
                var result = await _service.GetOrderedSeatsForShow(showId);
                if (result == null)
                {
                    return NotFound();
                }
                return Ok(result);
            }

        [HttpGet("userId/{userId}")]
        public async Task<ActionResult<List<OrderedSeatReadDTO>>> GetForUser(int userId)
        {
            var result = await _service.GetOrderedSeatsForUser(userId);
            if (result == null)
            {
                return NotFound();
            }
            return Ok(result);
        }
        //[HttpGet]
        //public IEnumerable<string> Get()
        //{
        //    return new string[] { "value1", "value2" };
        //}

        // GET api/<OrderedSeatController>/5
        [HttpGet("{id}")]
        public string Get(int id)
        {
            return "value";
        }

        // POST api/<OrderedSeatController>
        [HttpPost]
        public void Post([FromBody] string value)
        {
        }

        // PUT api/<OrderedSeatController>/5
        [HttpPut("{id}")]
        public void Put(int id, [FromBody] string value)
        {
        }

        // DELETE api/<OrderedSeatController>/5
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
        }
    }
}
