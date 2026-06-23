using System.Text.Json;
using DTOs;
using Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using NLog.Web;
using Repositories;
using Services;
using Services.Chat;
using Services.HumTest;
using WebApiShop.Middleware;
using WebApiShop.Middlewares;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.OpenApi.Models;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;



var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("ShowsCenter");
// In normal runs register SQL Server. In tests we want to override the DbContext with an in-memory Sqlite provider,
// avoid registering SQL Server provider when running under the "Testing" environment to prevent multiple providers
if (!builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddDbContext<ShowsCenterContext>(options =>
        options.UseSqlServer(connectionString));
}
// Add services to the container.
//builder.Services.AddScoped<ILoginRepository, LoginRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();

builder.Services.AddScoped<IProviderRepository, ProviderRepository>();
builder.Services.AddScoped<ISectionRepository, SectionRepository>();
builder.Services.AddScoped<IShowsRepository, ShowsRepository>();
builder.Services.AddScoped<IPasswordResetRepository, PasswordResetRepository>();
builder.Services.AddScoped<IRatingRepository, RatingRepository>();
builder.Services.AddScoped<IHumRepository, HumRepository>();
//builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    }); 
builder.Services.AddOpenApi();
// Configure Swagger/OpenAPI with JWT Bearer security so the "Authorize" button is available in UI
builder.Services.AddSwaggerGen(c =>
{
    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT token or click 'Authorize' and paste: Bearer {token}"
    };

    c.AddSecurityDefinition("Bearer", securityScheme);

    var securityRequirement = new OpenApiSecurityRequirement
    {
        { securityScheme, new[] { "Bearer" } }
    };
    c.AddSecurityRequirement(securityRequirement);
});
//builder.Services.AddScoped<ILoginService, LoginService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAuth, Auth>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IOrderService, OrderService>();

builder.Services.AddScoped<IProviderService, ProviderService>();
builder.Services.AddScoped<ISectionService, SectionService>();
builder.Services.AddScoped<IShowService, ShowService>();
// Configure HybridCache (uses Redis as a distributed cache backing)
// Ensure Redis:ConnectionString is present in configuration
// 1. שליפת מחרוזת החיבור המדויקת מה-JSON שלך (לפי המפתח "Redis:ConnectionString")
var redisConn = builder.Configuration["Redis:ConnectionString"];

// 2. רישום ה-StackExchangeRedisCache קודם (זה חובה עבור ה-HybridCache)
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = redisConn;
});

// 3. רישום ה-HybridCache שישתמש אוטומטית ברדיס שהגדרנו למעלה
builder.Services.AddHybridCache(options =>
{
    options.MaximumPayloadBytes = 1024 * 1024;
    options.MaximumKeyLength = 1024;
});


builder.Services.Configure<ForgotPasswordServiceOptions>(
    builder.Configuration.GetSection("PasswordReset"));
builder.Services.Configure<EmailSenderOptions>(
    builder.Configuration.GetSection("Email"));
// Bind Kafka settings for producers/consumers
builder.Services.Configure<Services.KafkaSettings>(builder.Configuration.GetSection("Kafka"));
// Bind LLM settings — ApiKey comes from user-secrets (dev) or LLM__ApiKey env var (prod/Docker)
builder.Services.Configure<LLMOptions>(builder.Configuration.GetSection(LLMOptions.SectionName));
// Register Kafka producer service (interface -> implementation)
builder.Services.AddSingleton<IKafkaProducerService, KafkaProducerService>();
builder.Services.AddScoped<IEmailSender, EmailSender>();
builder.Services.AddScoped<IForgotPasswordService, ForgotPasswordService>();
builder.Services.AddScoped<IOrderConfirmationEmailService, OrderConfirmationEmailService>();
builder.Services.AddScoped<IRatingService, RatingService>();

builder.Services.AddHttpClient("LlmClient", (sp, client) =>
{
    var llm = sp.GetRequiredService<IOptions<LLMOptions>>().Value;
    client.BaseAddress = new Uri(llm.BaseUrl);
    client.DefaultRequestHeaders.Authorization =
        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", llm.ApiKey);
    client.Timeout = TimeSpan.FromSeconds(60);
}).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
{
    // Linux/OpenSSL cannot auto-fetch missing intermediate CAs (unlike Windows).
    // Accept PartialChain only; all other SSL errors (expired, wrong host, etc.) are still rejected.
    SslOptions = new System.Net.Security.SslClientAuthenticationOptions
    {
        RemoteCertificateValidationCallback = (_, _, chain, errors) =>
        {
            if (errors == System.Net.Security.SslPolicyErrors.None) return true;
            if (errors == System.Net.Security.SslPolicyErrors.RemoteCertificateChainErrors
                && chain is not null)
            {
                return chain.ChainStatus.All(s =>
                    s.Status == System.Security.Cryptography.X509Certificates.X509ChainStatusFlags.PartialChain);
            }
            return false;
        }
    }
});
builder.Services.AddScoped<IChatService, ChatService>();

// HumTest — genre-detection & show-recommendation
builder.Services.AddSingleton<IGenreStrategy, HummingGenreStrategy>();
builder.Services.AddSingleton<IGenreStrategy, SingingGenreStrategy>();
if (builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing"))
    builder.Services.AddScoped<IAIAudioAnalyzer, MockAudioAnalyzer>();
else
    builder.Services.AddScoped<IAIAudioAnalyzer, ClaudeAudioAnalyzer>();
builder.Services.AddScoped<IHumService, HumService>();
// Observers
builder.Services.AddScoped<IHumEventObserver, AnalyticsObserver>();
builder.Services.AddScoped<IHumEventObserver, RecommendationObserver>();
// Command handlers
builder.Services.AddScoped<ICommandHandler<AnalyzeHumCommand, HumSessionResponseDto>, AnalyzeHumCommandHandler>();
builder.Services.AddScoped<ICommandHandler<GetSessionCommand, HumSessionResponseDto?>, GetSessionCommandHandler>();

builder.Services.AddExceptionHandler<ErrorHandlingMiddleware>();
builder.Services.AddProblemDetails();

//builder.Services.AddScoped<IProductService, ProductService>();


builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());
builder.Host.UseNLog();
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.WithOrigins("https://localhost:8080", "http://localhost:44304")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // <--- השורה הזו חובה בשביל לאפשר קוקיז!
    });
});

// JWT Authentication
var jwtSecret = builder.Configuration["JwtSettings:SecretKey"] ?? string.Empty;
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? string.Empty;
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? string.Empty;

// Provide a fallback secret when running tests so the test host can build a signing key.
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException("Configuration value JwtSettings:SecretKey is missing. Set it in appsettings or environment variables.");
}
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = signingKey,
        ValidateIssuer = !string.IsNullOrEmpty(jwtIssuer),
        ValidIssuer = jwtIssuer,
        ValidateAudience = !string.IsNullOrEmpty(jwtAudience),
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(2)
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Try to get token from X-Access-Token cookie
            var cookie = context.Request.Cookies["X-Access-Token"];
            if (!string.IsNullOrEmpty(cookie))
            {
                context.Token = cookie;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddRateLimiter(options =>
{
    // הגדרת מדיניות (Policy) מסוג Sliding Window
    options.AddSlidingWindowLimiter("MySlidingPolicy", opt =>
    {
        opt.PermitLimit = 10; // מקסימום 10 בקשות
        opt.Window = TimeSpan.FromMinutes(1); // בתוך חלון זמן של דקה אחת
        opt.SegmentsPerWindow = 3; // חלוקת הדקה ל-3 מקטעים (כלומר, בדיקה דינמית כל 20 שניות)
        opt.QueueLimit = 2; // כמה בקשות יכולות להמתין בתור אם עברנו את המכסה (0 אומר לחסום מיד)
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });

    options.AddSlidingWindowLimiter("StrictSlidingPolicy", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 2;
        opt.QueueLimit = 0;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });

    options.AddSlidingWindowLimiter("ChatLimitPolicy", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 3;
        opt.QueueLimit = 0;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });

    // מה קורה כשמשתמש נחסם? הגדרת קוד שגיאה 429
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseRating();
app.UseRouting();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
// UseRateLimiter must come after UseRouting so [EnableRateLimiting] endpoint metadata is visible.
app.UseRateLimiter();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "My API V1");
    });
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();

app.MapControllers();

// WebApplicationFactory (used in integration tests) intercepts app.Run() before the server
// actually starts listening — calling Run() unconditionally is required for the factory to work.
app.Run();
