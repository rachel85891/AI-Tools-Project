using AutoMapper;
using DTOs;
using Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Repositories;
using Services;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApiShop.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryController : ControllerBase
    {
        ICategoryService _service;
        IMapper _mapper;

        public CategoryController(ICategoryService service, IMapper mapper)
        {
            _service = service;
            _mapper = mapper;
        }

        // GET: api/<CategoryController>
        [HttpGet]
        public async Task<ActionResult<List<CategoryDTO>>> Get()
        {
            List<CategoryDTO> categories = await _service.getAllCategories();
            if(categories != null)
                return Ok(categories);
            else
                return NoContent();
        }

        // GET api/<CategoryController>/5
        [HttpGet("{id}")]
        public async Task<ActionResult<CategoryDTO>> Get(int id)
        {
            CategoryDTO category = await _service.getCategoryById(id);
            if (category != null)
                return Ok(category);
            else
                return NoContent();
        }



        // POST api/<CategoryController>
        [HttpPost]
        public async Task<ActionResult<Category>> Post([FromBody] CategoryDTO category,int userId)
        {
            Category newCategory = await _service.addCategory(category, userId);
            if (newCategory == null)
                return BadRequest();
            return CreatedAtAction(nameof(Get), new { newCategory.Id }, newCategory);
        }

        // PUT api/<CategoryController>/5
        //[HttpPut("{id}")]
        //public void Put(int id, [FromBody] string value)
        //{

        //}

        //DELETE api/<CategoryController>/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, int userId)
        {
            var item = await _service.getCategoryById(id);

            if (item == null)
            {
                return NotFound();
            }
            int? rowsAffected = await _service.Delete(id,userId);
            if (rowsAffected == null)
                return Unauthorized();
            if (rowsAffected > 0)
            {
                return NoContent();
            }
            return BadRequest();
        }
    }
}
