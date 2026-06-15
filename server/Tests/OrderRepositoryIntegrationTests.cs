using System;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using Entities;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Repositories;
using Xunit;

namespace Tests
{
    public class OrderRepositoryIntegrationTests : IAsyncLifetime, IDisposable
    {
        private DbConnection _connection;
        private ShowsCenterContext _context;
        private OrderRepository _repository;

        public async Task InitializeAsync()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<ShowsCenterContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new ShowsCenterContext(options);
            await _context.Database.EnsureCreatedAsync();

            _repository = new OrderRepository(_context);
        }

        public async Task DisposeAsync()
        {
            if (_context != null)
            {
                await _context.DisposeAsync();
            }
            if (_connection != null)
            {
                _connection.Close();
                _connection.Dispose();
            }
        }

        [Fact]
        public async Task Checkout_HappyPath_ComputesSumAndUpdatesStatuses()
        {
            // create required Category and Provider
            var category = new Category { Name = "C1" };
            var provider = new Provider { Name = "P1", ProfileImgUrl = "" };
            _context.Categories.Add(category);
            _context.Providers.Add(provider);
            await _context.SaveChangesAsync();

            var show = new Show { Title = "S1", Sector = "A", Audience = "All", ProviderId = provider.Id, CategoryId = category.Id };
            _context.Shows.Add(show);
            await _context.SaveChangesAsync();

            var section1 = new Section { ShowId = show.Id, Price = 10m, SectionType = 1 };
            var section2 = new Section { ShowId = show.Id, Price = 20m, SectionType = 1 };
            _context.Sections.AddRange(section1, section2);
            await _context.SaveChangesAsync();

            // create a user for the order
            var user = new User { FirstName = "U", LastName = "L", EmailAddress = "u@test", PhoneNumber = "0", Password = "x" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var order = new Order { UserId = user.Id, OrderDate = DateTime.Now, Price = 0 };
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            var os1 = new OrderedSeat { OrderId = order.Id, SectionId = section1.Id, Row = 1, Col = 1, Status = 1, ShowId = show.Id };
            var os2 = new OrderedSeat { OrderId = order.Id, SectionId = section2.Id, Row = 1, Col = 2, Status = 1, ShowId = show.Id };
            _context.OrderedSeats.AddRange(os1, os2);
            await _context.SaveChangesAsync();

            var result = await _repository.Checkout(new DTOs.CheckoutDTO(order.UserId, 0));

            Assert.NotNull(result);
            decimal expectedSum = (decimal)(section1.Price + section2.Price);
            Assert.Equal(expectedSum, (decimal)result.Price);
            var updatedSeats = _context.OrderedSeats.Where(s => s.OrderId == order.Id).ToList();
            Assert.All(updatedSeats, s => Assert.Equal(2, s.Status));
        }

        [Fact]
        public async Task Checkout_UnhappyPath_NoOpenOrder_ReturnsNull()
        {
            var category = new Category { Name = "C2" };
            var provider = new Provider { Name = "P2", ProfileImgUrl = "" };
            _context.Categories.Add(category);
            _context.Providers.Add(provider);
            await _context.SaveChangesAsync();

            var show = new Show { Title = "S-Unhappy", Sector = "A", Audience = "All", ProviderId = provider.Id, CategoryId = category.Id };
            _context.Shows.Add(show);
            await _context.SaveChangesAsync();

            var section = new Section { ShowId = show.Id, Price = 5m, SectionType = 1 };
            _context.Sections.Add(section);
            await _context.SaveChangesAsync();

            var user = new User { FirstName = "U2", LastName = "L2", EmailAddress = "u2@test", PhoneNumber = "0", Password = "x" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // seed an order with only closed seats (status 2) for user
            var order = new Order { UserId = user.Id, OrderDate = DateTime.Now, Price = 0 };
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            var closedSeat = new OrderedSeat { OrderId = order.Id, SectionId = section.Id, Row = 2, Col = 2, Status = 2, ShowId = show.Id };
            _context.OrderedSeats.Add(closedSeat);
            await _context.SaveChangesAsync();

            var result = await _repository.Checkout(new DTOs.CheckoutDTO(order.UserId, 0));

            Assert.Null(result);
        }

        [Fact]
        public async Task AddOrderedSeat_AssignsShowIdFromSection_AndReturnsSeat()
        {
            var category = new Category { Name = "C3" };
            var provider = new Provider { Name = "P3", ProfileImgUrl = "" };
            _context.Categories.Add(category);
            _context.Providers.Add(provider);
            await _context.SaveChangesAsync();

            var show = new Show { Title = "AssignShow", Sector = "A", Audience = "All", ProviderId = provider.Id, CategoryId = category.Id };
            _context.Shows.Add(show);
            await _context.SaveChangesAsync();

            var section = new Section { ShowId = show.Id, Price = 7m, SectionType = 1 };
            _context.Sections.Add(section);
            await _context.SaveChangesAsync();

            var user = new User { FirstName = "U3", LastName = "L3", EmailAddress = "u3@test", PhoneNumber = "0", Password = "x" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var order = new Order { UserId = user.Id, OrderDate = DateTime.Now, Price = 0 };
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            var seat = new OrderedSeat { OrderId = order.Id, SectionId = section.Id, Row = 3, Col = 3, ShowId = show.Id };
            var added = await _repository.addOrderedSeat(seat);

            Assert.NotNull(added);
            Assert.Equal(show.Id, added.ShowId);
            Assert.Equal(order.Id, added.OrderId);
        }

        [Fact]
        public async Task AddOrderedSeat_Throws_WhenSeatAlreadyTaken()
        {
            var category = new Category { Name = "C4" };
            var provider = new Provider { Name = "P4", ProfileImgUrl = "" };
            _context.Categories.Add(category);
            _context.Providers.Add(provider);
            await _context.SaveChangesAsync();

            var show = new Show { Title = "TakenShow", Sector = "A", Audience = "All", ProviderId = provider.Id, CategoryId = category.Id };
            _context.Shows.Add(show);
            await _context.SaveChangesAsync();

            var section = new Section { ShowId = show.Id, Price = 9m, SectionType = 1 };
            _context.Sections.Add(section);
            await _context.SaveChangesAsync();

            var order1 = new Order { UserId = 800, OrderDate = DateTime.Now, Price = 0 };
            var order2 = new Order { UserId = 801, OrderDate = DateTime.Now, Price = 0 };
            // create users for these orders
            var u1 = new User { FirstName = "A", LastName = "B", EmailAddress = "a@test", PhoneNumber = "", Password = "x" };
            var u2 = new User { FirstName = "C", LastName = "D", EmailAddress = "b@test", PhoneNumber = "", Password = "x" };
            _context.Users.AddRange(u1, u2);
            await _context.SaveChangesAsync();

            order1.UserId = u1.Id; order2.UserId = u2.Id;
            _context.Orders.AddRange(order1, order2);
            await _context.SaveChangesAsync();

            var seat1 = new OrderedSeat { OrderId = order1.Id, SectionId = section.Id, Row = 4, Col = 4, Status = 1, ShowId = show.Id };
            _context.OrderedSeats.Add(seat1);
            await _context.SaveChangesAsync();

            var seatDuplicate = new OrderedSeat { OrderId = order2.Id, SectionId = section.Id, Row = 4, Col = 4, Status = 1, ShowId = show.Id };
            await Assert.ThrowsAsync<InvalidOperationException>(async () => await _repository.addOrderedSeat(seatDuplicate));
        }

        [Fact]
        public async Task GetOrderedSeatsByShowId_ReturnsSeatsForShow()
        {
            var category = new Category { Name = "C5" };
            var provider = new Provider { Name = "P5", ProfileImgUrl = "" };
            _context.Categories.Add(category);
            _context.Providers.Add(provider);
            await _context.SaveChangesAsync();

            var show = new Show { Title = "SeatsShow", Sector = "A", Audience = "All", ProviderId = provider.Id, CategoryId = category.Id };
            _context.Shows.Add(show);
            await _context.SaveChangesAsync();

            var section = new Section { ShowId = show.Id, Price = 4m, SectionType = 1 };
            _context.Sections.Add(section);
            await _context.SaveChangesAsync();

            var user = new User { FirstName = "U5", LastName = "L5", EmailAddress = "u5@test", PhoneNumber = "0", Password = "x" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var order = new Order { UserId = user.Id, OrderDate = DateTime.Now, Price = 0 };
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            var seat = new OrderedSeat { OrderId = order.Id, SectionId = section.Id, Row = 5, Col = 5, ShowId = show.Id };
            _context.OrderedSeats.Add(seat);
            await _context.SaveChangesAsync();

            var result = await _repository.getOrderedSeatsByShowId(show.Id);
            Assert.NotNull(result);
            Assert.Single(result);
            Assert.Equal(show.Id, result.First().ShowId);
        }

        public void Dispose()
        {
            _context?.Dispose();
            _connection?.Dispose();
        }
    }
}