using System.Globalization;
using System.Text;
using TimeBank.Api.DTOs;

namespace TimeBank.Api.Services;

public class OrderConfirmationEmailService : IOrderConfirmationEmailService
{
    private readonly IEmailSender _emailSender;

    public OrderConfirmationEmailService(IEmailSender emailSender)
    {
        _emailSender = emailSender;
    }

    public async Task<SendOrderConfirmationResult> SendAsync(SendOrderConfirmationRequest request, CancellationToken ct = default)
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
        catch
        {
            return new SendOrderConfirmationResult(false, "Failed to send confirmation email.");
        }
    }

    private static string BuildHtmlBody(SendOrderConfirmationRequest request)
    {
        var he = CultureInfo.GetCultureInfo("he-IL");
        var sb = new StringBuilder();
        var orderDate = request.OrderDate == default
            ? DateTime.UtcNow.ToLocalTime()
            : request.OrderDate.ToLocalTime();

        sb.AppendLine(@"<div dir=""rtl"" style=""font-family: Arial; font-size: 16px; color: #1f2937;"">");
        sb.AppendLine($@"  <p>שלום {(string.IsNullOrWhiteSpace(request.FirstName) ? "משתמש" : request.FirstName)},</p>");
        sb.AppendLine(@"  <p>תודה על ההזמנה. להלן פרטי הרכישה:</p>");
        sb.AppendLine(@"  <div style=""background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin:12px 0;"">");
        sb.AppendLine($@"    <p style=""margin:0 0 6px 0;""><strong>קוד הזמנה:</strong> {request.OrderCode}</p>");
        sb.AppendLine($@"    <p style=""margin:0;""><strong>תאריך ושעת יצירה:</strong> {orderDate.ToString("dd/MM/yyyy HH:mm", he)}</p>");
        sb.AppendLine(@"  </div>");
        sb.AppendLine(@"  <table style=""width:100%;border-collapse:collapse;"">");
        sb.AppendLine(@"    <thead>");
        sb.AppendLine(@"      <tr>");
        sb.AppendLine(@"        <th style=""text-align:right;padding:8px;border-bottom:1px solid #d1d5db;"">מופע</th>");
        sb.AppendLine(@"        <th style=""text-align:right;padding:8px;border-bottom:1px solid #d1d5db;"">מקום</th>");
        sb.AppendLine(@"        <th style=""text-align:right;padding:8px;border-bottom:1px solid #d1d5db;"">תאריך מופע</th>");
        sb.AppendLine(@"        <th style=""text-align:right;padding:8px;border-bottom:1px solid #d1d5db;"">מחיר</th>");
        sb.AppendLine(@"      </tr>");
        sb.AppendLine(@"    </thead>");
        sb.AppendLine(@"    <tbody>");

        foreach (var item in request.Items)
        {
            var showDate = item.ShowDate.HasValue
                ? item.ShowDate.Value.ToLocalTime().ToString("dd/MM/yyyy", he)
                : "-";
            var showTime = string.IsNullOrWhiteSpace(item.ShowTime) ? "" : $" בשעה {item.ShowTime}";
            var place = $"{item.Section} · שורה {item.Row} · כיסא {item.Col}";
            sb.AppendLine(@"      <tr>");
            sb.AppendLine($@"        <td style=""padding:8px;border-bottom:1px solid #e5e7eb;"">{item.ShowTitle}</td>");
            sb.AppendLine($@"        <td style=""padding:8px;border-bottom:1px solid #e5e7eb;"">{place}</td>");
            sb.AppendLine($@"        <td style=""padding:8px;border-bottom:1px solid #e5e7eb;"">{showDate}{showTime}</td>");
            sb.AppendLine($@"        <td style=""padding:8px;border-bottom:1px solid #e5e7eb;"">{item.Price:0.##}₪</td>");
            sb.AppendLine(@"      </tr>");
        }

        sb.AppendLine(@"    </tbody>");
        sb.AppendLine(@"  </table>");
        sb.AppendLine($@"  <p style=""margin-top:14px;""><strong>סה""כ שולם:</strong> {request.TotalPaid:0.##}₪</p>");
        sb.AppendLine(@"  <p style=""margin-top:18px;"">נתראה במופע הבא!</p>");
        sb.AppendLine(@"</div>");

        return sb.ToString();
    }
}
