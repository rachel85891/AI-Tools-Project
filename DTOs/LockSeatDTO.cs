using Microsoft.Extensions.Configuration.UserSecrets;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTOs
{
    public record LockSeatDTO
    (
        int UserId,
        int Row,
        int Col,
        int sectionId
    );
}
