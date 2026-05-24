using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using DTOs;

namespace Services
{
    public interface IOrderConfirmationEmailService
    {
        Task<SendOrderConfirmationResult> SendAsync(SendOrderConfirmationRequest request, CancellationToken ct = default);
    }

    public record SendOrderConfirmationResult(bool Sent, string? Message = null);

}
