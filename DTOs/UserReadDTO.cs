using Entities;
using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace DTOs
{
    public record UserReadDTO(int Id, string FirstName, string LastName, string EmailAddress, string PhoneNumber, ICollection<OrderDTO> Orders);
}
