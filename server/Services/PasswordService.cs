using Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using BCrypt.Net;

namespace Services
{
    public class PasswordService : IPasswordService
    {
        public PasswordService() { }
        public PasswordEntity getStrengthByPassword(string password)
        {
            var result = Zxcvbn.Core.EvaluatePassword(password);
            int strength = result.Score;
            PasswordEntity passwordEntity = new PasswordEntity();
            passwordEntity.Password = password;
            passwordEntity.Strength = strength;
            return passwordEntity;
        }

        public string HashPassword(string password)
        {
            if (string.IsNullOrEmpty(password))
                throw new ArgumentException("Password must not be empty", nameof(password));

            // Use a secure work factor. 12 is a reasonable default balancing security and performance.
            var workFactor = 12;
            return BCrypt.Net.BCrypt.HashPassword(password, workFactor);
        }

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
    }
}
