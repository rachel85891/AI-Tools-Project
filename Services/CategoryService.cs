using AutoMapper;
using DTOs;
using Entities;
using Microsoft.AspNetCore.Mvc;
using Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Services
{
    public class CategoryService : ICategoryService
    {
        IAuth _auth;
        ICategoryRepository _repository;
        IMapper _mapper;

        public CategoryService(ICategoryRepository repository, IMapper mapper, IAuth auth)
        {
            _repository = repository;
            _mapper = mapper;
            _auth = auth;
        }
        public async Task<List<CategoryDTO>> getAllCategories()
        {
            List<Category> categories = await _repository.getAllCategories();
            List<CategoryDTO> categoriesDTO = _mapper.Map<List<Category>, List<CategoryDTO>>(categories);
            return categoriesDTO;
        }

        public async Task<CategoryDTO> getCategoryById(int id)
        {
            Category category = await _repository.getCategoryById(id);
            CategoryDTO categoryDTO = _mapper.Map<Category, CategoryDTO>(category);
            return categoryDTO;

        }
        public async Task<Category?> addCategory(CategoryDTO category, int userId)
        {
            if (!await _auth.IsManager(userId))
            {
                return null;
            }
            Category newCategory = _mapper.Map<CategoryDTO, Category>(category);
            newCategory =  await _repository.addCategory(newCategory);
            return newCategory;
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
