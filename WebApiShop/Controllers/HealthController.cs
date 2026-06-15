using Microsoft.AspNetCore.Mvc;

namespace WebApiShop.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "Healthy", time = DateTime.UtcNow });
}
