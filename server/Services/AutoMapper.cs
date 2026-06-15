using AutoMapper;
using DTOs;
using Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Services
{
    public class AutoMapper: Profile
    {
        public AutoMapper() {
            CreateMap<UserUpdateDTO, User>();
            CreateMap<User, UserReadDTO>();
            CreateMap<UserCreateDTO, User>();
            CreateMap<Order, OrderDTO>();
            CreateMap<OrderCreateDTO, Order>();
            CreateMap<UserLoginDTO, User>();
            CreateMap<Category, CategoryDTO>();
            CreateMap<CategoryDTO, Category> ();
            CreateMap<ProviderReadDTO, Provider>();
            CreateMap<Provider, ProviderReadDTO>();
            CreateMap<ProviderCreateDTO, Provider> ();
            CreateMap<Section, SectionReadDTO>();
            CreateMap<SectionCreateDTO, Section>();
            CreateMap<Show, ShowReadDTO>();
            CreateMap<ShowCreateDTO, Show>();
            CreateMap<Show, ShowCreateDTO>();
            CreateMap<ShowUpdateDTO, Show>();
            CreateMap<OrderedSeat, OrderedSeatReadDTO>();
            CreateMap<OrderUpdateDTO, Order>();
            CreateMap<LockSeatDTO, OrderedSeat>();

        }
    }
}
//michmich!!145