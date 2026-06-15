# Forgot Password – .NET 9 Backend (Layered)

This folder contains the **controller**, **service**, and **repository** layers for the forgot-password flow. Integrate these into your existing .NET 9 Web API project.

**Recommendation:** Password reset **must** be implemented on the server (generate code, send email, validate code, update password). The Angular app only calls two API endpoints; all logic stays on the server.

## Flow

1. **POST /api/Users/forgot-password** – Body: `{ "email": "user@example.com" }`  
   - Finds user by email, generates a 6-digit code, saves it with expiry (e.g. 15 min), sends email with the code.  
   - Returns: `{ "sent": true }` or `{ "sent": false, "message": "..." }`.

2. **POST /api/Users/reset-password** – Body: `{ "email": "...", "code": "123456", "newPassword": "..." }`  
   - Validates code for that email (and expiry), updates user password (hashed), then deletes/invalidates the code.  
   - Returns: `{ "success": true }` or `{ "success": false, "message": "..." }`.

3. **POST /api/Users/send-order-confirmation** – Body includes checkout summary (email, order code/date, items, total).  
   - Sends a confirmation email with the full order details (same content style as checkout step 4).  
   - Returns: `{ "sent": true }` or `{ "sent": false, "message": "..." }`.

## Integration Steps

### 1. Add NuGet packages (in your Web API project)

```bash
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design
# For sending email (choose one):
dotnet add package MailKit
# or: dotnet add package SendGrid
```

### 2. Database – Password reset codes table

Run this SQL (or add a migration) in your existing DB:

```sql
CREATE TABLE PasswordResetCodes (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(256) NOT NULL,
    Code NVARCHAR(20) NOT NULL,
    ExpiresAt DATETIME2 NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
CREATE INDEX IX_PasswordResetCodes_Email_Code ON PasswordResetCodes(Email, Code);
```

If you use EF Core, add the entity and DbSet (see **Data/Entities/PasswordResetCode.cs** and register in your `DbContext`).

### 3. Configuration (appsettings.json)

```json
{
  "PasswordReset": {
    "CodeExpirationMinutes": 15,
    "CodeLength": 6
  },
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "UseSsl": true,
    "UserName": "your-email@gmail.com",
    "Password": "your-app-password",
    "FromAddress": "your-email@gmail.com",
    "FromName": "TimeBank"
  }
}
```

For Gmail use an [App Password](https://support.google.com/accounts/answer/185833), not your normal password.

### 4. Copy files into your project

- **DTOs** → e.g. `Models/DTOs/` or `Contracts/DTOs/`
- **Entity** → `Data/Entities/` (if using EF)
- **Repository** → `Data/Repositories/`
- **Service** → `Services/` or `Application/Services/`
- **Controller** → add the two actions to your existing `UsersController` (or use the provided controller and map routes).

### 5. Register in Program.cs (or Startup.cs)

```csharp
// Options (add these so Email and PasswordReset sections are bound)
builder.Services.Configure<ForgotPasswordServiceOptions>(
    builder.Configuration.GetSection("PasswordReset"));
builder.Services.Configure<EmailSenderOptions>(
    builder.Configuration.GetSection("Email"));

// Repository
builder.Services.AddScoped<IPasswordResetRepository, PasswordResetRepository>();

// Email sender
builder.Services.AddScoped<IEmailSender, EmailSender>();

// Forgot-password service
builder.Services.AddScoped<IForgotPasswordService, ForgotPasswordService>();

// Order confirmation email service
builder.Services.AddScoped<IOrderConfirmationEmailService, OrderConfirmationEmailService>();
```

Ensure your `DbContext` is registered and includes `DbSet<PasswordResetCode>` if you use the EF-based repository.

### 6. CORS and base URL

Your Angular app runs at a different origin; ensure your API allows it (CORS) and that the Angular `HttpClient` base URL points to your API (e.g. `https://localhost:44304`).

---

## File layout in this folder

- `DTOs/` – Request/response models.
- `Data/Entities/` – EF entity for reset codes.
- `Data/Repositories/` – Interface + implementation (EF Core).
- `Services/` – Interface + implementation (forgot-password + email).
- `Controllers/` – Example controller actions (merge into your UsersController).

After integration, test with the Angular “שכחת סיסמה?” flow: enter email → receive code by email → enter code + new password → success.
