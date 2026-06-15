using Entities;
using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace DTOs
{
    public record ShowReadDTO(
        int Id, 
        string Title, 
        DateOnly Date,
        TimeOnly BeginTime,
        TimeOnly EndTime,
        string Audience, 
        string Sector, 
        string Description, 
        string ImgUrl, 
        int CategoryId,
        string CategoryName,
        ICollection<OrderedSeatReadDTO> OrderedSeats,
        int ProviderId,
        string ProviderName,
        string ProviderProfileImgUrl,
        ICollection<SectionReadDTO> Sections
        );
}
