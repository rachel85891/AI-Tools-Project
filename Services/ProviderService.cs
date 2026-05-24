using AutoMapper;
using DTOs;
using Entities;
using Repositories;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Services
{
    public class ProviderService : IProviderService
    {
        IAuth _auth;
        IProviderRepository _repository;
        IMapper _mapper;
        public ProviderService(IProviderRepository repository, IMapper mapper, IAuth auth)
        {
            _repository = repository;
            _mapper = mapper;
            _auth = auth;
        }

        public async Task<ProviderReadDTO> getProviderById(int id)
        {
            Provider provider = await _repository.getProviderById(id);
            ProviderReadDTO providerDTO = _mapper.Map<Provider, ProviderReadDTO>(provider);
            return providerDTO;
        }

        public async Task<List<ProviderReadDTO>> getAllProviders()
        {
            List<Provider> providers = await _repository.getAllProviders();
            List<ProviderReadDTO> providerDTOs = _mapper.Map<List<Provider>, List<ProviderReadDTO>>(providers);
            return providerDTOs;
        }

        public async Task<ProviderReadDTO?> addProvider(ProviderCreateDTO provider, int userId)
        {
            if (!await _auth.IsManager(userId))
                return null;
            Provider newProvider = _mapper.Map<ProviderCreateDTO, Provider>(provider);
            newProvider = await _repository.addProvider(newProvider);
            ProviderReadDTO providerDTO = _mapper.Map<Provider, ProviderReadDTO>(newProvider);
            return providerDTO;
        }

        public async Task<bool> deleteProvider(int id, int userId)
        {
            if (!await _auth.IsManager(userId))
                return false;
            return await _repository.deleteProvider(id);
        }

    }
}
