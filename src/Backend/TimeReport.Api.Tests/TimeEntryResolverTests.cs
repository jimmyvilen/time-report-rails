using TimeReport.Api.Services;

namespace TimeReport.Api.Tests;

public class TimeEntryResolverTests
{
    private readonly TimeEntryResolverService _resolver = new();
    private const string Date = "2025-05-19";

    private static DateTime DT(string time) =>
        DateTime.Parse($"{Date}T{time}:00");

    [Fact]
    public void StartAndEnd_CalculatesDuration()
    {
        var result = _resolver.Resolve(Date, DT("08:00"), DT("09:30"), null);
        Assert.Equal(DT("08:00"), result.StartTime);
        Assert.Equal(DT("09:30"), result.EndTime);
        Assert.Equal(90, result.DurationMinutes);
    }

    [Fact]
    public void StartAndDuration_CalculatesEnd()
    {
        var result = _resolver.Resolve(Date, DT("08:00"), null, 90);
        Assert.Equal(DT("08:00"), result.StartTime);
        Assert.Equal(DT("09:30"), result.EndTime);
        Assert.Equal(90, result.DurationMinutes);
    }

    [Fact]
    public void EndAndDuration_CalculatesStart()
    {
        var result = _resolver.Resolve(Date, null, DT("09:30"), 90);
        Assert.Equal(DT("08:00"), result.StartTime);
        Assert.Equal(DT("09:30"), result.EndTime);
        Assert.Equal(90, result.DurationMinutes);
    }

    [Fact]
    public void DurationOnly_ReturnsNullTimes()
    {
        var result = _resolver.Resolve(Date, null, null, 60);
        Assert.Null(result.StartTime);
        Assert.Null(result.EndTime);
        Assert.Equal(60, result.DurationMinutes);
    }

    [Fact]
    public void EndBeforeStart_Throws()
    {
        Assert.Throws<ArgumentException>(() =>
            _resolver.Resolve(Date, DT("10:00"), DT("09:00"), null));
    }

    [Fact]
    public void NothingProvided_Throws()
    {
        Assert.Throws<ArgumentException>(() =>
            _resolver.Resolve(Date, null, null, null));
    }

    [Fact]
    public void MidnightCrossing_Throws()
    {
        var nextDay = DateTime.Parse($"2025-05-20T00:30:00");
        Assert.Throws<ArgumentException>(() =>
            _resolver.Resolve(Date, DT("23:00"), nextDay, null));
    }
}
