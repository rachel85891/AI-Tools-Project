using Entities;

namespace Repositories
{
    public interface ICategoryRepository
    {
        Task<Category> addCategory(Category category);
        Task<List<Category>> getAllCategories();
        Task<Category> getCategoryById(int id);
        Task<int> Delete(int id);

    }
}