using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using KafkaWorker;

var host = Host.CreateDefaultBuilder(args)
    .ConfigureServices((context, services) =>
    {
        services.AddHostedService<KafkaConsumerWorker>();
    })
    .Build();

await host.RunAsync();
