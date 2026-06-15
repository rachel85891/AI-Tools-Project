using System.Threading.Tasks;

namespace Services
{
    public interface IKafkaProducerService
    {
        Task SendMessageAsync(string message);
    }
}
