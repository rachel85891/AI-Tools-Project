using DTOs;
using Entities;
using Microsoft.AspNetCore.Mvc;

namespace Services
{
    public interface ICategoryService
    {
        Task<List<CategoryDTO>> getAllCategories();
        Task<CategoryDTO> getCategoryById(int id);
        Task<Category?> addCategory(CategoryDTO category, int userId);
        Task<int?> Delete(int id, int userId);

    }
}