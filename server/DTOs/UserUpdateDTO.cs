using Entities;
using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace DTOs
{
    public record UserUpdateDTO(int Id, string FirstName, string LastName, string EmailAddress, string PhoneNumber, string Password);
}
