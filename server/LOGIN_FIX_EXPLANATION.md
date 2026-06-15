# Login Issue Fix: Cannot Login with Any User

## Problem Summary
You couldn't login to the app, even with newly created users that have properly hashed passwords in the database. The login always failed with "Email or password is incorrect" message.

## Root Cause Analysis

### The Issue: Fixed-Length Email Column
The database `email_address` column in the `Users` table was configured as **CHAR(30)** (fixed-length), not `VARCHAR(30)` (variable-length).

**In the EF Core configuration** (`ShowsCenterContext.cs`):
```csharp
entity.Property(e => e.EmailAddress)
    .HasMaxLength(30)
    .IsFixedLength()  // <-- This causes CHAR(30) in database
    .HasColumnName("email_address");
```

### How This Broke Login

1. **User enters email**: `esti.levi100@gmail.com` (20 characters)

2. **Database stores it**: `esti.levi100@gmail.com` + **10 trailing spaces** = 30 characters (CHAR padding)
   ```
   Stored in DB: "esti.levi100@gmail.com          " (30 chars total)
   ```

3. **Query tries to find user**: 
   ```csharp
   getUserByEmail("esti.levi100@gmail.com")
   ```

4. **Comparison fails**:
   - Input (trimmed): `"esti.levi100@gmail.com"` (20 chars)
   - Database value: `"esti.levi100@gmail.com          "` (30 chars)
   - `"esti.levi100@gmail.com" != "esti.levi100@gmail.com          "`

5. **Query returns NULL**: User not found → Login fails with 401 Unauthorized

### The EF Core LINQ Query
```csharp
// Old code - failed:
return await _context.Users.FirstOrDefaultAsync(u => u.EmailAddress.ToLower() == normalized);
// Compares: "esti.levi100@gmail.com          " == "esti.levi100@gmail.com"
// Result: False (due to padding)
```

## Solution

### Change 1: Remove Fixed-Length Configuration
**File**: `Entities/ShowsCenterContext.cs`

**Before**:
```csharp
entity.Property(e => e.EmailAddress)
    .HasMaxLength(30)
    .IsFixedLength()  // Causes CHAR(30)
    .HasColumnName("email_address");
```

**After**:
```csharp
entity.Property(e => e.EmailAddress)
    .HasMaxLength(30)
    // Removed .IsFixedLength() - now uses VARCHAR(30)
    .HasColumnName("email_address");
```

**Effect**: New migrations will create `VARCHAR(30)` instead of `CHAR(30)`, storing emails without padding.

### Change 2: Add Defensive Trim in Repository Query
**File**: `Repositories/UserRepository.cs`

**Before**:
```csharp
public async Task<User> getUserByEmail(string email)
{
    var normalized = email?.Trim().ToLowerInvariant();
    if (string.IsNullOrEmpty(normalized))
        return null;

    return await _context.Users.FirstOrDefaultAsync(u => u.EmailAddress.ToLower() == normalized);
}
```

**After**:
```csharp
public async Task<User> getUserByEmail(string email)
{
    var normalized = email?.Trim().ToLowerInvariant();
    if (string.IsNullOrEmpty(normalized))
        return null;

    // Trim database value in case of fixed-length column with padding
    return await _context.Users.FirstOrDefaultAsync(u => u.EmailAddress.Trim().ToLower() == normalized);
}
```

**Effect**: Even existing data with CHAR padding will match correctly.

## Impact

### Before Fix
- Email column: CHAR(30) with padding
- Queries fail: `"esti.levi100@gmail.com" != "esti.levi100@gmail.com          "`
- All logins fail with 401 Unauthorized
- Cannot use the app at all

### After Fix
- Email column: VARCHAR(30) without padding (for future records)
- Queries succeed: `"esti.levi100@gmail.com" == "esti.levi100@gmail.com"`
- Login works with all users
- Existing users with padded emails still work due to `.Trim()` in query

## Database Migration Steps

To apply this fix to your existing database:

1. **For future deployments**: The configuration change will be picked up by EF Core migrations
   ```bash
   dotnet ef migrations add RemoveFixedLengthEmailColumn --project Entities --startup-project WebApiShop
   dotnet ef database update --project Entities --startup-project WebApiShop
   ```

2. **For existing databases** (optional - to clean up): Run this SQL to convert CHAR to VARCHAR
   ```sql
   ALTER TABLE Users
   ALTER COLUMN email_address VARCHAR(30);
   ```

   This removes padding from existing emails.

## Why This Happened

Fixed-length columns (CHAR) are rarely appropriate for email addresses because:
- Email lengths vary significantly
- CHAR always pads with spaces, wasting storage
- CHAR causes comparison issues if not handled carefully in code
- VARCHAR is better for variable-length text like emails, names, URLs

## Testing

After applying the fix:
1. Stop and rebuild: `dotnet build`
2. Restart the API
3. Try logging in with any user (existing or new)
4. Login should now succeed ✓

## Files Modified
1. `Entities/ShowsCenterContext.cs` - Removed `.IsFixedLength()` from EmailAddress property
2. `Repositories/UserRepository.cs` - Added `.Trim()` to database value in query comparison

## Recommendation

Consider reviewing other fixed-length columns in your schema:
- `FirstName` and `LastName` with `.IsFixedLength()` - probably okay but consider VARCHAR
- `Password` with `.IsFixedLength()` - not ideal; BCrypt hashes are variable length anyway
- General: Use VARCHAR unless you have a specific reason for fixed length (rare)
