using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace Entities
{
    public record ProviderReadDTO(int Id, string Name, string ProfileImgUrl);
    public record ProviderCreateDTO(string Name, string ProfileImgUrl);

}
