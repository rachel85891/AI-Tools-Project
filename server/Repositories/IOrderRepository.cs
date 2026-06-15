using DTOs;
using Entities;

namespace Repositories
{
    public interface IOrderRepository
    {
        Task<Order> addOrder(Order order);
        Task<OrderedSeat> addOrderedSeat(OrderedSeat orderedSeat);
        Task<Order> Checkout(CheckoutDTO orderToUpdate);
        Task<List<Order>> getAllOrders();
        Task<Order> getOrderById(int id);
        Task<Order?> getOrderByOrderesSeatId(int seatId);
        Task<List<OrderedSeat>> getOrderedSeatsByShowId(int showId);
        Task<List<OrderedSeat>> getOrderedSeatsByUserId(int userId);
        Task<List<Order>> getOrdersForUser(int user);
        Task<int> unLockSeat(int id);
        Task<Order> updateOrder(Order order);
    }
}