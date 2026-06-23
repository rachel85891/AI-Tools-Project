using System.Net;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace WebApiShop.Middlewares
{
    public class ErrorHandlingMiddleware: IExceptionHandler
    {
        private readonly ILogger<ErrorHandlingMiddleware> _logger;

        public ErrorHandlingMiddleware(ILogger<ErrorHandlingMiddleware> logger)
        {
            _logger = logger;
        }

        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            _logger.LogError(exception, "Exception occurred: {Message}", exception.Message);

            var (statusCode, title, detail) = exception switch
            {
                ArgumentOutOfRangeException e => (400, "Validation Error", e.Message),
                ArgumentException e           => (400, "Validation Error", e.Message),
                _                             => (500, "Server Error", "משהו השתבש בשרת, הצוות הטכני עודכן.")
            };

            var problemDetails = new ProblemDetails
            {
                Status   = statusCode,
                Title    = title,
                Detail   = detail,
                Instance = httpContext.Request.Path
            };

            httpContext.Response.StatusCode = statusCode;

            await httpContext.Response
                .WriteAsJsonAsync(problemDetails, cancellationToken);

            return true;
        }
    }
}
