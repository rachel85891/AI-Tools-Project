using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entities;

namespace DTOs
{
    public record SectionReadDTO
    (
        int Id,
        decimal Price,
        int showId,
        int sectionType,
        ICollection<OrderedSeatReadDTO> OrderedSeats
    );
}
