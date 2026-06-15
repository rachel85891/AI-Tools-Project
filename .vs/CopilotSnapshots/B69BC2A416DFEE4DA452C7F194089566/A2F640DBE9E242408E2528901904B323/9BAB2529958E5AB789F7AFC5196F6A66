using Entities;
using Microsoft.AspNetCore.Mvc;
using Services;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApiShop.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PasswordController : ControllerBase
    {
        IPasswordService _service;

        public PasswordController(IPasswordService service)
        {
            _service = service;
        }


        //// GET: api/<PasswordController>
        //[HttpGet]
        //public IEnumerable<string> Get()
        //{
        //    return new string[] { "value1", "value2" };
        //}

        // GET api/<PasswordController>/5
        //[HttpGet("{pass}")]
        //public ActionResult<PasswordEntity> Get(string pass)
        //{
        //    PasswordEntity password = _service.getStrengthByPassword(pass);
        //    if (password == null)
        //        return NoContent();
        //    return Ok(password);
        //}

        // POST api/<PasswordController>
        [HttpPost]
        public ActionResult<PasswordEntity> POST([FromBody] string pass)
        {
            PasswordEntity password = _service.getStrengthByPassword(pass);
            if (password == null)
                return NoContent();
            return Ok(password);
        }

        //// PUT api/<PasswordController>/5
        //[HttpPut("{id}")]
        //public void Put(int id, [FromBody] string value)
        //{
        //}

        //// DELETE api/<PasswordController>/5
        //[HttpDelete("{id}")]
        //public void Delete(int id)
        //{
        //}
    }
}
