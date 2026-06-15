namespace TimeBank.Api.DTOs;

public class SendOrderConfirmationRequest
{
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string OrderCode { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public decimal TotalPaid { get; set; }
    public List<SendOrderConfirmationItemDto> Items { get; set; } = new();
}

public class SendOrderConfirmationItemDto
{
    public string ShowTitle { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
    public int Row { get; set; }
    public int Col { get; set; }
    public DateTime? ShowDate { get; set; }
    public string ShowTime { get; set; } = string.Empty;
    public decimal Price { get; set; }
}
