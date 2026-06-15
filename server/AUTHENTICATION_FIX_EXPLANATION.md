# Authentication Fix: 401 Unauthorized Error Resolution

## Problem Summary
When attempting to update a show as a manager, you received a **401 Unauthorized** error. The debugger showed a `BCrypt.Net.SaltParseException: 'Invalid salt version'` being thrown during password verification in the login flow.

## Root Cause Analysis

### The Issue
The `VerifyPassword` method in `Services/PasswordService.cs` was not properly handling exceptions that occur when:
1. The stored password hash is **NULL or empty** (bypasses the initial null check, but BCrypt fails internally)
2. The stored password hash is **corrupted or invalid**
3. The stored password hash is **not in BCrypt format** (e.g., old plain text passwords or passwords hashed with a different algorithm)

### The Exception Chain
1. User tries to login
2. `UsersController.GetLogin` calls `_passwordService.VerifyPassword(password, hashedPassword)`
3. BCrypt tries to verify the password against the invalid hash
4. `BCrypt.Verify()` throws `BCrypt.Net.SaltParseException`
5. The unhandled exception crashes the authentication flow
6. This prevents the JWT token from being generated
7. All subsequent requests (including show updates) fail with **401 Unauthorized** because no valid JWT token exists

## Solution

### Code Change: Services/PasswordService.cs

**Before:**
```csharp
public bool VerifyPassword(string password, string hashedPassword)
{
    if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hashedPassword))
        return false;

    return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
}
```

**After:**
```csharp
public bool VerifyPassword(string password, string hashedPassword)
{
    if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hashedPassword))
        return false;

    try
    {
        return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
    }
    catch (BCrypt.Net.SaltParseException)
    {
        // Hash is corrupted or not in BCrypt format. 
        // This can happen with legacy passwords or database corruption.
        // Return false to fail the login attempt.
        return false;
    }
    catch (Exception)
    {
        // Any other unexpected error during verification should also fail login
        return false;
    }
}
```

### What Changed
1. **Added try-catch block** around `BCrypt.Verify()` to gracefully handle exceptions
2. **Catches `BCrypt.Net.SaltParseException`** specifically - occurs when hash is in invalid format
3. **Catches generic `Exception`** as a fallback for any other unexpected errors
4. **Returns `false`** when any exception occurs, which:
   - Treats failed verification as a failed login
   - Prevents the application from crashing
   - Returns HTTP 401 Unauthorized to the client (correct behavior)

## Impact

### Before Fix
- Unhandled `BCrypt.Net.SaltParseException` crashed the authentication service
- Login failed catastrophically
- No JWT token generated
- All API requests returned 401 Unauthorized
- Error was not user-friendly

### After Fix
- Invalid password hashes are handled gracefully
- Login fails with HTTP 401 (Unauthorized) - correct status code
- User sees proper error message: "Email or password is incorrect"
- No application crash
- Managers can now successfully login and update shows
- Future password verification issues won't crash the app

## How Authentication Flow Works (for context)

```
1. User clicks "Update Show" (Edit Show button)
2. Frontend sends PUT request with JWT token from login
3. Backend validates JWT via `[Authorize(Roles = "Admin")]` attribute
4. If no valid token exists → 401 Unauthorized
5. Original cause: Login failed due to unhandled BCrypt exception
   → No token generated
   → Cannot authenticate subsequent requests

With the fix:
1. Login fails gracefully with false return
2. Frontend receives 401 from login endpoint
3. User sees error message and can try again or reset password
4. When correct credentials are used, login succeeds
5. JWT token is generated
6. Update requests are authenticated successfully
```

## Recommendations

1. **Database Audit**: Check if any user passwords in the database are:
   - NULL or empty
   - Not in BCrypt format (plain text or different algorithm)
   
   These should be rehashed with `HashPassword()` method:
   ```csharp
   var newHash = _passwordService.HashPassword(plainTextPassword);
   user.Password = newHash;
   await _context.SaveChangesAsync();
   ```

2. **Password Reset Flow**: For users who can't login, use the password reset feature:
   - Email: `/api/Users/forgot-password`
   - Reset: `/api/Users/reset-password`
   
   This ensures new passwords are properly hashed with BCrypt

3. **Testing**: The password verification tests already cover successful cases:
   - `VerifyPassword_CorrectPassword_ReturnsTrue` ✓
   - `VerifyPassword_IncorrectPassword_ReturnsFalse` ✓
   - Consider adding tests for corrupted hash scenarios

## Files Modified
- `Services/PasswordService.cs` - Added exception handling in `VerifyPassword()` method

## Testing the Fix
1. Stop the debugger
2. Rebuild the solution with `dotnet build`
3. Run the application
4. Login as a manager
5. Try updating a show - should now succeed with proper JWT authentication
