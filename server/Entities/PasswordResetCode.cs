using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public class PasswordResetCode
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
