using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;

namespace Services
{
    public class EmailSenderOptions
    {
        public const string SectionName = "Email";
        public string SmtpHost { get; set; } = "smtp.gmail.com";
        public int SmtpPort { get; set; } = 587;
        public bool UseSsl { get; set; } = true;
        public string UserName { get; set; } = "";
        public string Password { get; set; } = "";
        public string FromAddress { get; set; } = "";
        public string FromName { get; set; } = "TimeBank";
    }

    public class EmailSender : IEmailSender
    {
        private readonly EmailSenderOptions _options;

        public EmailSender(IOptions<EmailSenderOptions> options)
        {
            _options = options.Value;
        }

        //public async Task SendAsync(string toEmail, string subject, string body, CancellationToken ct = default)
        //{

        //    using var client = new SmtpClient(_options.SmtpHost, _options.SmtpPort)
        //    {
        //        EnableSsl = _options.UseSsl,
        //        Credentials = new NetworkCredential(_options.UserName, _options.Password)
        //    };
        //    var msg = new MailMessage
        //    {
        //        From = new MailAddress(_options.FromAddress, _options.FromName),
        //        Subject = subject,
        //        Body = body,
        //        IsBodyHtml = true
        //    };
        //    msg.To.Add(toEmail);
        //    await client.SendMailAsync(msg, ct);
        //}

        //    public async Task SendAsync(string toEmail, string subject, string body, CancellationToken ct = default)
        //    {
        //        // 1. פתרון לבעיית IPv6 בנטפרי: שליפת כתובת IPv4 בלבד עבור שרת גוגל
        //        var addresses = await System.Net.Dns.GetHostAddressesAsync("smtp.gmail.com", ct);
        //        var ipv4Address = addresses.FirstOrDefault(x => x.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);

        //       System.Net.ServicePointManager.ServerCertificateValidationCallback = (s, c, h, e) => true;

        //        using var client = new System.Net.Mail.SmtpClient(ipv4Address.ToString(), 587)
        //        {
        //            EnableSsl = true,
        //            UseDefaultCredentials = false,
        //            Credentials = new System.Net.NetworkCredential("r0583285891@gmail.com", "rimo yqbq ifow pmqt"),
        //            DeliveryMethod = System.Net.Mail.SmtpDeliveryMethod.Network,
        //            Timeout = 10000
        //        };

        //        var mailMessage = new System.Net.Mail.MailMessage
        //        {
        //            From = new System.Net.Mail.MailAddress("r0583285891@gmail.com", "ShowsCenter"),
        //            Subject = subject,
        //            Body = body,
        //            IsBodyHtml = true
        //        };
        //        mailMessage.To.Add(toEmail);

        //        await client.SendMailAsync(mailMessage);
        //    }

        public async Task SendAsync(string toEmail, string subject, string body, CancellationToken ct = default)
        {
            // 1. הגדרה לנטפרי
            System.Net.ServicePointManager.ServerCertificateValidationCallback = (s, c, h, e) => true;

            // 2. ניקוי רווחים מהסיסמה למקרה שנשארו
            var cleanPassword = _options.Password.Replace(" ", "").Trim();

            using var client = new System.Net.Mail.SmtpClient(_options.SmtpHost, _options.SmtpPort)
            {
                EnableSsl = true,
                UseDefaultCredentials = false,
                DeliveryMethod = System.Net.Mail.SmtpDeliveryMethod.Network,
                Timeout = 20000,
                // השורה הזו עוזרת ל-Gmail לזהות את החיבור המאובטח נכון בתוך רשת מסוננת
                TargetName = "STARTTLS/smtp.gmail.com"
            };

            client.Credentials = new System.Net.NetworkCredential(_options.UserName, cleanPassword);

            var mailMessage = new System.Net.Mail.MailMessage
            {
                From = new System.Net.Mail.MailAddress(_options.FromAddress, _options.FromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            mailMessage.To.Add(toEmail);

            await client.SendMailAsync(mailMessage);
        }
    }
    }
