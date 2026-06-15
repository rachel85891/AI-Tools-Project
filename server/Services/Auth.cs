using AutoMapper;
using Entities;
using Repositories;

namespace Services
{
    public class Auth : IAuth
    {
        IUserRepository _repository;
        List<string> _managerEmails = ["r0583285891@gmail.com", "michal.icecream@gmail.com"];
        public Auth(IUserRepository repository)
        {
            _repository = repository;
        }

        public async Task<Boolean> IsManager(int id)
        {
            User user = await _repository.getUserById(id);
            if(user == null)
            {
                return false;
            }
            if (_managerEmails.Contains(user.EmailAddress.Trim()))
                return true;
            return false;
        }
    }
}
