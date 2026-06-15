using AutoMapper;
using DTOs;
using Entities;
using Microsoft.AspNetCore.Mvc;
using Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using System.Security.Cryptography;


namespace Services
{
    public class ShowService : IShowService
    {
        IAuth _auth;
        IShowsRepository _repository;
        IMapper _mapper;
        readonly HybridCache _cache;
        readonly IConfiguration _config;

        public ShowService(IShowsRepository repository, IMapper mapper, IAuth auth, HybridCache cache, IConfiguration config)
        {
            _repository = repository;
            _mapper = mapper;
            _auth = auth;
            _cache = cache;
            _config = config;
        }

        public async Task<List<ShowReadDTO>> getAllShows()
        {
            List<Show> shows = await _repository.getAllShows();
            List<ShowReadDTO> showsDTO = _mapper.Map<List<Show>, List<ShowReadDTO>>(shows);
            return showsDTO;
        }
        public async Task<ShowReadDTO> getShowById(int id)
        {
            Show show = await _repository.getShowById(id);
            ShowReadDTO showDTO = _mapper.Map<Show, ShowReadDTO>(show);
            return showDTO;
        }
        public async Task<ShowReadDTO?> addShow(ShowCreateDTO showCDTO, int userId)
        {
            if ( !await _auth.IsManager(userId))
                return null;
            Show show = _mapper.Map<ShowCreateDTO, Show>(showCDTO);
            show = await _repository.addShow(show);
            ShowReadDTO showDTO = _mapper.Map<Show, ShowReadDTO>(show);
            return showDTO;
        }
        public async Task<ShowReadDTO?> updateShow(ShowUpdateDTO showUDTO, int id, int userId)
        {
            if (!await _auth.IsManager(userId))
                return null;
            Show show = _mapper.Map<ShowUpdateDTO, Show>(showUDTO);
            show = await _repository.updateOrder(show, id);
            ShowReadDTO showDTO = _mapper.Map<Show, ShowReadDTO>(show);
            return showDTO;
        }
        public async Task<(IEnumerable<ShowReadDTO> shows, int total)> getAllShows([FromQuery] ShowFilterDTO filters)
        {
            // Generate a stable cache key from the filter DTO
            var json = JsonSerializer.Serialize(filters, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            // short hash to avoid extremely long keys
            string cacheKey;
            using (var sha = SHA256.Create())
            {
                var hash = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(json));
                cacheKey = "shows:filters:" + Convert.ToHexString(hash);
            }

            // TTL from configuration (seconds). Default to 60s when missing or invalid.
            var ttlSeconds = _config.GetValue<int?>("Caching:ShowsTtlSeconds") ?? 60;

            // Use HybridCache to Get or Create the cached value
            var cacheOptions = new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromSeconds(ttlSeconds)
            };

            // 2. קריאה ל-GetOrCreateAsync ומסירת ה-options כפרמטר
            var result = await _cache.GetOrCreateAsync<(IEnumerable<ShowReadDTO> shows, int total)>(
                cacheKey,
                async cancelToken =>
                {
                    var repoResult = await _repository.getAllShows(filters);
                    var showsDTO = _mapper.Map<IEnumerable<ShowReadDTO>>(repoResult.shows);
                    return (showsDTO, repoResult.total);
                },
                options: cacheOptions // כאן אנחנו מעבירים את ה-TTL
            );

            return result;
        }
        public async Task<int?> Delete(int id, int userId)
        {
            if (!await _auth.IsManager(userId))
            {
                return null;
            }
            return await _repository.Delete(id);
        }
    }
}
