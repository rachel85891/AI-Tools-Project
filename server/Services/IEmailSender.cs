using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Services
{
    public interface IEmailSender
    {
        Task SendAsync(string toEmail, string subject, string body, CancellationToken ct = default);
        //Task SendEmailAsync(string email, string subject, string htmlMessage);
    }
}
