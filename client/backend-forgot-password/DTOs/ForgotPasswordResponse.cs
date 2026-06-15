namespace TimeBank.Api.DTOs;

public class ForgotPasswordResponse
{
    public bool Sent { get; set; }
    public string? Message { get; set; }
}
