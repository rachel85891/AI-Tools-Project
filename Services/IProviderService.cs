using Entities;

namespace Services
{
    public interface IProviderService
    {
        Task<ProviderReadDTO?> addProvider(ProviderCreateDTO provider, int userId);
        Task<bool> deleteProvider(int id, int userId);
        Task<List<ProviderReadDTO>> getAllProviders();
        Task<ProviderReadDTO> getProviderById(int id);
    }
}