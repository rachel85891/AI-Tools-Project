using Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
    }
}
