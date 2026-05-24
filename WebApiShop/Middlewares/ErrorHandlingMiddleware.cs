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
            // רישום השגיאה ללוג הפנימי של השרת
            _logger.LogError(exception, "Exception occurred: {Message}", exception.Message);

            // יצירת תשובה מסודרת למשתמש
            var problemDetails = new ProblemDetails
            {
                Status = (int)HttpStatusCode.InternalServerError,
                Title = "Server Error",
                Detail = "משהו השתבש בשרת, הצוות הטכני עודכן.",
                Instance = httpContext.Request.Path
            };

            // הגדרת סוג התוכן כ-JSON ושליחת התשובה
            httpContext.Response.StatusCode = problemDetails.Status.Value;

            await httpContext.Response
                .WriteAsJsonAsync(problemDetails, cancellationToken);

            return true;
        }
    }
}
