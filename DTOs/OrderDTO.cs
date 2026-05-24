using Entities;
using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace DTOs
{
    public record OrderDTO(int Id, DateTime OrderDate, decimal Price, string UserFirstName, ICollection<OrderedSeatReadDTO> OrderedSeats);    
    public record OrderCreateDTO(decimal Price, int UserId);
    public record OrderUpdateDTO(int Id, decimal Price, int UserId);

}
