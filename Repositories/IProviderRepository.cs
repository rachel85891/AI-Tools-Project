using Entities;

namespace Repositories
{
    public interface IProviderRepository
    {
        Task<Provider> addProvider(Provider provider);
        Task<bool> deleteProvider(int id);
        Task<List<Provider>> getAllProviders();
        Task<Provider> getProviderById(int id);
    }
}