using System.Threading.Tasks;

namespace Services
{
    public interface IKafkaProducerService
    {
        Task SendMessageAsync(string message);
        Task SendMessageAsync(string topic, string message);
    }
}
