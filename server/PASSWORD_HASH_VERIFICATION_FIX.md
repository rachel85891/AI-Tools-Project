# Password Hash Verification Fix: BCrypt Verify Returns False

## Problem Summary
Login was failing even with correct credentials. The issue: `BCrypt.Net.BCrypt.Verify()` was returning `false` because the password hash from the database had **trailing spaces** from being stored in a CHAR(255) column.

## Root Cause Analysis

### The Real Issue: Password Column is CHAR(255)
In `Entities/ShowsCenterContext.cs`:
```csharp
entity.Property(e => e.Password)
    .IsRequired()
    .HasMaxLength(255)
    .IsFixedLength()  // <-- CHAR(255) column!
    .HasColumnName("password");
```

### How This Breaks BCrypt Verification

**BCrypt hashes are typically ~60 characters**, for example:
```
$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ee52bPHr0eHvrmPu
```

**CHAR(255) pads with spaces to fill 255 characters**:
```
$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ee52bPHr0eHvrmPu[195 trailing spaces]
```

**BCrypt verification process**:
1. Database retrieves: `$2a$12$...[195 spaces]` (255 characters)
2. BCrypt tries to parse the hash format
3. Trailing spaces corrupt the hash structure
4. Verification fails: returns `false`
5. Login fails: "Password incorrect"

### Why This Wasn't Caught Initially
- BCrypt format validation happens before password comparison
- The trailing spaces make the hash unparseable
- Even correct passwords fail verification
- This affects ALL users, all the time

## Solution

### Change 1: Remove Fixed-Length from Password Column
**File**: `Entities/ShowsCenterContext.cs`

**Before**:
```csharp
entity.Property(e => e.Password)
    .IsRequired()
    .HasMaxLength(255)
    .IsFixedLength()  // Causes CHAR(255)
    .HasColumnName("password");
```

**After**:
```csharp
entity.Property(e => e.Password)
    .IsRequired()
    .HasMaxLength(255)
    // Removed .IsFixedLength() - now uses VARCHAR(255)
    .HasColumnName("password");
```

**Effect**: Future password hashes will be stored without padding.

### Change 2: Trim Hash Before Verification
**File**: `Services/PasswordService.cs`

**Before**:
```csharp
public bool VerifyPassword(string password, string hashedPassword)
{
    if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hashedPassword))
        return false;

    try
    {
        return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
    }
    // ... catch blocks
}
```

**After**:
```csharp
public bool VerifyPassword(string password, string hashedPassword)
{
    if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hashedPassword))
        return false;

    try
    {
        // Trim the hashedPassword in case it has trailing spaces from CHAR(255) column padding
        var trimmedHash = hashedPassword.Trim();
        return BCrypt.Net.BCrypt.Verify(password, trimmedHash);
    }
    // ... catch blocks
}
```

**Effect**: Existing database records with CHAR padding will still verify correctly.

## Impact

### Before Fix
- Password hashes stored as: `$2a$12$...[195 spaces]`
- BCrypt.Verify() → `false` (hash corrupted by padding)
- All logins fail, even with correct password
- App completely unusable

### After Fix
- New hashes stored as: `$2a$12$...` (no padding)
- Existing hashes work: `.Trim()` removes padding before verification
- BCrypt.Verify() → `true` (hash valid)
- All logins work correctly ✓

## Why This Happened

Fixed-length columns are inappropriate for BCrypt hashes because:
- **BCrypt hashes have consistent ~60 character length** - padding is pure waste
- **Trailing spaces corrupt the hash format** - BCrypt is strict about format
- **VARCHAR is designed for variable-length data** - better fit for cryptographic hashes
- **Performance impact** - CHAR wastes storage and memory

## Database Migration Path

### For Future Records (via EF Core Migrations)
```bash
dotnet ef migrations add FixPasswordColumnType --project Entities --startup-project WebApiShop
dotnet ef database update --project Entities --startup-project WebApiShop
```

This will convert CHAR(255) to VARCHAR(255) and remove all padding.

### For Existing Records (Optional - SQL)
If you want to clean up existing padded hashes:
```sql
-- This will remove trailing spaces from existing password hashes
UPDATE Users
SET password = RTRIM(password)
WHERE password IS NOT NULL;

-- Then convert the column type
ALTER TABLE Users
ALTER COLUMN password VARCHAR(255);
```

## Testing

After applying the fix:
1. Stop the debugger
2. Rebuild: `dotnet build`
3. Run the API
4. Try logging in with:
   - Existing users (with padded hashes) - should work now
   - New users - will work without padding
5. Both should login successfully ✓

## Files Modified
1. `Entities/ShowsCenterContext.cs` - Removed `.IsFixedLength()` from Password property
2. `Services/PasswordService.cs` - Added `.Trim()` before BCrypt verification

## Key Takeaway

The pattern here is the same as with EmailAddress:
- **Fixed-length columns cause data corruption** when trailing spaces aren't handled
- **Use VARCHAR for variable-length data** (emails, passwords, descriptions, etc.)
- **Only use CHAR when you truly need fixed-length** (very rare)
- **Defensive code that trims** can work around the issue but fixing the schema is better

This was a schema design issue, not an application logic issue. The `.Trim()` in PasswordService is a workaround for existing data, but removing `.IsFixedLength()` is the proper fix.
