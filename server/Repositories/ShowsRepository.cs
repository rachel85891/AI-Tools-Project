using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entities;
using DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Client;

namespace Repositories
{
    public class ShowsRepository : IShowsRepository
    {
        ShowsCenterContext _context;
        public ShowsRepository(ShowsCenterContext ShowsCenterContext)
        {
            _context = ShowsCenterContext;
        }
        //to add filters, sorting, and pagination!!!!!
        public async Task<List<Show>> getAllShows()
        {
            return await _context.Shows.Include(s=>s.Provider).Include(s=>s.Category).ToListAsync();
        }

        public async Task<Show> getShowById(int id)
        {
            return await _context.Shows
                .AsNoTracking()
                .Include(s => s.Provider)
                .Include(s => s.Category)
                .Include(s => s.Sections)
                    .ThenInclude(d => d.OrderedSeats)
                    .ThenInclude(o=>o.Order)
                    .ThenInclude(u=>u.User)
                .FirstOrDefaultAsync(o => o.Id == id);
        }
        public async Task<Show> addShow(Show show)
        {
            await _context.Shows.AddAsync(show);
            await _context.SaveChangesAsync();
            if (getShowById(show.Id) != null)
                return show;
            else
                return null;
        }
        public async Task<Show> updateOrder(Show show, int id)
        {
            var local = _context.Set<Show>()
                .Local
                .FirstOrDefault(entry => entry.Id.Equals(id));

            if (local != null)
            {
                _context.Entry(local).State = EntityState.Detached;
            }

            _context.Entry(show).State = EntityState.Modified;

            await _context.SaveChangesAsync();
            return show;
        }

        public async Task<(IEnumerable<Show> shows, int total)> getAllShows(ShowFilterDTO filters)
        {

            var query = _context.Shows.Where(show =>
                        (filters.description == null ? (true) : (show.Title.Contains(filters.description)))
                        && ((filters.minPrice == null) ? (true) : show.Sections.Any() && (show.Sections.Min(s=>s.Price) >= filters.minPrice))
                        && ((filters.maxPrice == null) ? (true) : show.Sections.Any() && (show.Sections.Max(s => s.Price) <= filters.maxPrice))
                        && (filters.categoryIdS == null || filters.categoryIdS.Length == 0 || filters.categoryIdS.Contains(show.CategoryId))
                        && (filters.audiences == null || filters.audiences.Length == 0 || filters.audiences.Any(a => show.Audience.Trim().Contains(a.Trim())))
                        && (filters.sectors == null || filters.sectors.Length == 0 || filters.sectors.Any(s => show.Sector.Contains(s.Trim()))))
                            .OrderBy(show => show.Sections.Min(s => s.Price)).Include(s => s.Provider).Include(s => s.Category);
            if (!string.IsNullOrEmpty(filters.sortField))
            {
                switch (filters.sortField.ToLower())
                {
                    case "price":
                        if (filters.sortOrder == 1)
                            query = query.OrderBy(show => show.Sections.Min(s => s.Price)).Include(s => s.Provider).Include(s => s.Category);
                        else
                            query = query.OrderByDescending(show => show.Sections.Min(s => s.Price)).Include(s => s.Provider).Include(s => s.Category);
                        break;

                    case "popularity":
                        query = query.OrderByDescending(show => show.OrderedSeats.Count(c=>c.ShowId==show.Id)).Include(s => s.Provider).Include(s => s.Category);
                        break;

                    case "title":
                        query = query = query.OrderBy(show => show.Title).Include(s => s.Provider).Include(s => s.Category);
                        break;
                }
            }

            var total = await query.CountAsync();
            List<Show> shows = await query.Skip((filters.position - 1) * filters.skip)
            .Take(filters.skip)
            .Include(show => show.Category)
            .Include(show => show.Sections)
            .ToListAsync();
            return (shows, total);
        }
        public async Task<int> Delete(int id)
        {
            var item = await _context.Shows
                .Include(s => s.Sections)
                    .ThenInclude(sec => sec.OrderedSeats)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (item == null) return 0;

            foreach (var section in item.Sections)
            {
                _context.OrderedSeats.RemoveRange(section.OrderedSeats);
            }
            _context.Sections.RemoveRange(item.Sections);
            _context.Shows.Remove(item);

            return await _context.SaveChangesAsync();
        }

        //public async Task deleteShow(int id)
        //{
        //        await _context.Shows.ExecuteDeleteAsync(s => s.Id == id);
        //        await _context.SaveChangesAsync();
        //}
    }
}
