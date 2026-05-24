using DTOs;
using Entities;
using Microsoft.AspNetCore.Mvc;

namespace Services
{
    public interface IOrderService
    {
        Task<OrderDTO> addOrder(OrderCreateDTO order);
        Task<OrderDTO> Checkout(CheckoutDTO orderToUpdate);
        Task<List<OrderDTO>> getAllOrders();
        Task<OrderDTO> getOrderById(int id);
        Task<List<OrderedSeatReadDTO>> GetOrderedSeatsForShow(int showId);
        Task<List<OrderedSeatReadDTO>> GetOrderedSeatsForUser(int userId);
        Task<List<OrderDTO>> getOrdersForUser(int id);
        Task<OrderedSeatReadDTO> LockSeat(LockSeatDTO orderDTO);
        Task<int> UnLockseat(int id, int userId);
        Task<OrderDTO> updateOrder(OrderUpdateDTO orderToUpdate, int id);
    }
}