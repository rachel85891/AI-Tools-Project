using System;
using System.Threading.Tasks;
using DTOs;
using Services.HumTest;

namespace Tests;

public class AudioValidationHandlerTests
{
    private static AudioValidationHandlerBase BuildChain()
    {
        var audio = new AudioValidationHandler();
        var duration = new DurationCheckHandler();
        var format = new FormatCheckHandler();
        audio.SetNext(duration).SetNext(format);
        return audio;
    }

    [Fact]
    public async Task Chain_EmptyAudio_ThrowsArgumentException()
    {
        var chain = BuildChain();
        var dto = new HumSessionCreateDto("", 5.0, null);

        await Assert.ThrowsAsync<ArgumentException>(() => chain.HandleAsync(dto));
    }

    [Fact]
    public async Task Chain_DurationZero_ThrowsArgumentOutOfRangeException()
    {
        var chain = BuildChain();
        var dto = new HumSessionCreateDto(Convert.ToBase64String(new byte[10]), 0.0, null);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => chain.HandleAsync(dto));
    }

    [Fact]
    public async Task Chain_DurationOverMax_ThrowsArgumentOutOfRangeException()
    {
        var chain = BuildChain();
        var dto = new HumSessionCreateDto(Convert.ToBase64String(new byte[10]), 301.0, null);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => chain.HandleAsync(dto));
    }

    [Fact]
    public async Task Chain_InvalidBase64_ThrowsArgumentException()
    {
        var chain = BuildChain();
        var dto = new HumSessionCreateDto("!!!not-base64!!!", 5.0, null);

        await Assert.ThrowsAsync<ArgumentException>(() => chain.HandleAsync(dto));
    }

    [Fact]
    public async Task Chain_ValidInput_CompletesWithoutException()
    {
        var chain = BuildChain();
        var dto = new HumSessionCreateDto(Convert.ToBase64String(new byte[100]), 5.0, null);

        var exception = await Record.ExceptionAsync(() => chain.HandleAsync(dto));

        Assert.Null(exception);
    }
}
