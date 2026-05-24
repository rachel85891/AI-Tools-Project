
namespace Services
{
    public interface IAuth
    {
        Task<bool> IsManager(int id);
    }
}