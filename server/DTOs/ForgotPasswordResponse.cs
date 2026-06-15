using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTOs
{
    public class ForgotPasswordResponse
    {
        public bool Sent { get; set; }
        public string? Message { get; set; }
    }

}
