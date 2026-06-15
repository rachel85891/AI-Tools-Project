using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace TimeBank.Api.Services;

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

    public async Task SendAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        using var client = new SmtpClient(_options.SmtpHost, _options.SmtpPort)
        {
            EnableSsl = _options.UseSsl,
            Credentials = new NetworkCredential(_options.UserName, _options.Password)
        };
        var msg = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        msg.To.Add(toEmail);
        await client.SendMailAsync(msg, ct);
    }
}
