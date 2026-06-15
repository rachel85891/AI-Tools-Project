// A minimal DbContext implementation so the compiled project has the
// ShowsCenterContext type referenced by EF migrations and other projects.
#nullable disable
using Microsoft.EntityFrameworkCore;

namespace Entities
{
    public partial class ShowsCenterContext : DbContext
    {
        public ShowsCenterContext()
        {
        }

        public ShowsCenterContext(DbContextOptions<ShowsCenterContext> options)
            : base(options)
        {
        }

        public virtual DbSet<Category> Categories { get; set; }
        public virtual DbSet<Order> Orders { get; set; }
        public virtual DbSet<OrderedSeat> OrderedSeats { get; set; }
        public virtual DbSet<Provider> Providers { get; set; }
        public virtual DbSet<Section> Sections { get; set; }
        public virtual DbSet<Show> Shows { get; set; }
        public virtual DbSet<User> Users { get; set; }
        public virtual DbSet<Rating> Ratings { get; set; }
        public virtual DbSet<PasswordResetCode> PasswordResetCodes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Intentionally empty - migrations include the model in Designer files.
            // If you have custom model configuration, add it here or in a partial class.
        }
    }
}
