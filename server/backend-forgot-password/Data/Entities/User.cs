using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TimeBank.Api.Data.Entities;

[Table("Users")]
public class User
{
    [Key]
    public int Id { get; set; }

    [MaxLength(256)]
    public string FirstName { get; set; } = string.Empty;

    [MaxLength(256)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string EmailAddress { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Password { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? PhoneNumber { get; set; }
}
