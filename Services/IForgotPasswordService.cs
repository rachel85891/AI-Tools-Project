using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Services
{
    public interface IForgotPasswordService
    {
        Task<ForgotPasswordResult> RequestCodeAsync(string email, CancellationToken ct = default);
        Task<ResetPasswordResult> ResetPasswordAsync(string email, string code, string newPassword, CancellationToken ct = default);
    }

    public record ForgotPasswordResult(bool Sent, string? Message = null);
    public record ResetPasswordResult(bool Success, string? Message = null);

}
