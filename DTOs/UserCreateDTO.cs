using Entities;
using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace DTOs
{
    public record UserCreateDTO(string FirstName, string LastName, string EmailAddress, string PhoneNumber, string Password);
    public record UserLoginDTO(string EmailAddress, string Password);

}
