using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Globalization;
using System.Text;
using DTOs;

namespace Services
{
    

    public class OrderConfirmationEmailService : IOrderConfirmationEmailService
    {
        private readonly IEmailSender _emailSender;

        public OrderConfirmationEmailService(IEmailSender emailSender)
        {
            _emailSender = emailSender;
        }

        public async Task<SendOrderConfirmationResult> SendAsync(
            SendOrderConfirmationRequest request,
            CancellationToken ct = default)
        {
            var email = request.Email?.Trim();
            if (string.IsNullOrWhiteSpace(email))
                return new SendOrderConfirmationResult(false, "Email is required.");

            if (request.Items == null || request.Items.Count == 0)
                return new SendOrderConfirmationResult(false, "Order items are required.");

            var subject = $"אישור הזמנה - {request.OrderCode}";
            var body = BuildHtmlBody(request);

            try
            {
                await _emailSender.SendAsync(email, subject, body, ct);
                return new SendOrderConfirmationResult(true);
            }
            catch (Exception ex)
            {
                // הציבי כאן Breakpoint כדי לראות מה כתוב בתוך ex.Message
                return new SendOrderConfirmationResult(false, ex.Message);
            }
        }

        private static string BuildHtmlBody(SendOrderConfirmationRequest request)
        {
            var he = CultureInfo.GetCultureInfo("he-IL");
            var sb = new StringBuilder();

            sb.AppendLine(@"<div dir=""rtl"" style=""font-family: Arial; font-size: 16px; color: #1f2937;"">");
            sb.AppendLine($@"  <p>שלום {(string.IsNullOrWhiteSpace(request.FirstName) ? "משתמש" : request.FirstName)},</p>");
            sb.AppendLine(@"  <p>תודה על ההזמנה. להלן פרטי הרכישה:</p>");
            sb.AppendLine($@"  <p><strong>קוד הזמנה:</strong> {request.OrderCode}</p>");
            sb.AppendLine($@"  <p><strong>תאריך הזמנה:</strong> {request.OrderDate.ToLocalTime().ToString("dd/MM/yyyy HH:mm", he)}</p>");
            sb.AppendLine(@"  <hr/>");

            foreach (var item in request.Items)
            {
                var showDate = item.ShowDate.HasValue
                    ? item.ShowDate.Value.ToLocalTime().ToString("dd/MM/yyyy", he)
                    : "-";
                var showTime = string.IsNullOrWhiteSpace(item.ShowTime) ? "" : $" בשעה {item.ShowTime}";

                sb.AppendLine($@"<p><strong>{item.ShowTitle}</strong><br/>
                    מקום: {item.Section} · שורה {item.Row} · כיסא {item.Col}<br/>
                    תאריך מופע: {showDate}{showTime}<br/>
                    מחיר: {item.Price:0.##}₪</p>");
            }

            sb.AppendLine(@"<hr/>");
            sb.AppendLine($@"<p><strong>סה""כ שולם:</strong> {request.TotalPaid:0.##}₪</p>");
            sb.AppendLine(@"</div>");

            return sb.ToString();
        }
    }

}
