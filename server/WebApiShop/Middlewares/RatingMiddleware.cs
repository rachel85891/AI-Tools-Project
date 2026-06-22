using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Services;
using Entities;
using System;
using System.Threading.Tasks;

namespace WebApiShop.Middleware
{
    public class RatingMiddleware
    {
        private readonly RequestDelegate _next;

        public RatingMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext httpContext, IRatingService ratingService)
        {
            Rating rating = new Rating();
            rating.Host = httpContext.Request.Host.Value;
            rating.Method = httpContext.Request.Method;
            rating.Path = httpContext.Request.Path;
            rating.Referer = httpContext.Request.Headers.Referer;
            rating.UserAgent = httpContext.Request.Headers.UserAgent;
            rating.RecordDate = DateTime.Now;

            try
            {
                await ratingService.AddRating(rating);
            }
            catch
            {
                // swallow — a failed rating write must not block the request
            }

            await _next(httpContext);
        }
    }

    public static class RatingExtensions
    {
        public static IApplicationBuilder UseRating(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<RatingMiddleware>();
        }
    }
}
