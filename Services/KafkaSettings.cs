namespace Services
{
    public class KafkaSettings
    {
        public const string SectionName = "Kafka";
        public string TopicName { get; set; } = "order-events";
        public string? BootstrapServers { get; set; }
    }
}
