using System;
using System.Threading.Tasks;
using Confluent.Kafka;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;

namespace Services
{
    public class KafkaProducerService : IDisposable, IKafkaProducerService
    {
        private readonly IProducer<string, string> _producer;
        private readonly ILogger<KafkaProducerService>? _logger;
        private readonly KafkaSettings _settings;

        public KafkaProducerService(IConfiguration configuration, IOptions<KafkaSettings> options, ILogger<KafkaProducerService>? logger = null)
        {
            _logger = logger;

            _settings = options?.Value ?? throw new ArgumentNullException(nameof(options));

            var bootstrap = _settings.BootstrapServers ?? configuration["Kafka:BootstrapServers"];
            if (string.IsNullOrWhiteSpace(bootstrap))
            {
                throw new ArgumentException("Kafka BootstrapServers configuration 'Kafka:BootstrapServers' is missing.");
            }

            var config = new ProducerConfig { BootstrapServers = bootstrap };

            _producer = new ProducerBuilder<string, string>(config).Build();
        }

        // Convenience method that sends to configured TopicName
        public Task SendMessageAsync(string message)
        {
            var topic = _settings.TopicName ?? throw new ArgumentException("Kafka TopicName is not configured.");
            return SendMessageAsync(topic, message);
        }

        public async Task SendMessageAsync(string topic, string message)
        {
            if (string.IsNullOrWhiteSpace(topic)) throw new ArgumentNullException(nameof(topic));

            try
            {
                var msg = new Message<string, string> { Key = null, Value = message };
                var delivery = await _producer.ProduceAsync(topic, msg).ConfigureAwait(false);

                // Some versions of Confluent.Kafka do not expose an Error property on DeliveryResult.
                // Check the delivery status instead and log useful details.
                if (delivery.Status != PersistenceStatus.Persisted)
                {
                    _logger?.LogError("Failed to deliver message to topic {topic}. Delivery status: {status}, partition: {partition}, offset: {offset}", topic, delivery.Status, delivery.Partition, delivery.Offset);
                    throw new Exception($"Failed to deliver message to topic {topic}. Delivery status: {delivery.Status}");
                }

                _logger?.LogDebug("Message delivered to topic {topic} partition {partition} offset {offset}", topic, delivery.Partition, delivery.Offset);
            }
            catch (ProduceException<string, string> ex)
            {
                _logger?.LogError(ex, "ProduceException while sending message to topic {topic}", topic);
                throw;
            }
        }

        public void Dispose()
        {
            try
            {
                _producer.Flush(TimeSpan.FromSeconds(5));
            }
            catch
            {
                // ignore
            }
            _producer.Dispose();
        }
    }
}
