using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace DTOs
{
    public record ShowUpdateDTO(
        int Id,
        string Title, 
        DateOnly Date,
        TimeOnly BeginTime,
        TimeOnly EndTime,
        string Audience, 
        string Sector, 
        string Description, 
        string ImgUrl, 
        int ProviderId, 
        int CategoryId);
}
