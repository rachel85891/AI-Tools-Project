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

            return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
        }
    }
}
