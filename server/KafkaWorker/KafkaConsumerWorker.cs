using System;
using System.Threading;
using System.Threading.Tasks;
using Confluent.Kafka;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace KafkaWorker
{
    public class KafkaConsumerWorker : BackgroundService
    {
        private readonly ILogger<KafkaConsumerWorker> _logger;
        private readonly IConfiguration _config;

        public KafkaConsumerWorker(ILogger<KafkaConsumerWorker> logger, IConfiguration config)
        {
            _logger = logger;
            _config = config;
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            return Task.Run(() => RunConsumerLoop(stoppingToken), stoppingToken);
        }

        private void RunConsumerLoop(CancellationToken stoppingToken)
        {
            var bootstrap = _config["Kafka:BootstrapServers"];
            var topic = _config["Kafka:TopicName"] ?? "order-events";

            var conf = new ConsumerConfig
            {
                BootstrapServers = bootstrap,
                GroupId = "order-consumer-group",
                AutoOffsetReset = AutoOffsetReset.Earliest
            };

            using var consumer = new ConsumerBuilder<string, string>(conf).Build();
            consumer.Subscribe(topic);

            try
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        var cr = consumer.Consume(stoppingToken);
                        if (cr != null)
                        {
                            Console.WriteLine($"Consumed message '{cr.Message.Value}' at: '{cr.TopicPartitionOffset}'.");
                        }
                    }
                    catch (ConsumeException e)
                    {
                        _logger.LogError(e, "Consume error: {message}", e.Message);
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // shutting down
            }
            finally
            {
                consumer.Close();
            }
        }
    }
}
