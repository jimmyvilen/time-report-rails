using TimeReport.Api.Services;

namespace TimeReport.Api.Tests;

public class DurationParserTests
{
    private readonly DurationParser _parser = new();

    [Theory]
    [InlineData("1h 30m", 90)]
    [InlineData("90m", 90)]
    [InlineData("1.5h", 90)]
    [InlineData("2h", 120)]
    [InlineData("45m", 45)]
    [InlineData("1h", 60)]
    public void Parse_ValidInput_ReturnsMinutes(string input, int expected)
    {
        Assert.Equal(expected, _parser.Parse(input));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("invalid")]
    [InlineData("-1h")]
    [InlineData("0h")]
    [InlineData("0m")]
    public void Parse_InvalidInput_ReturnsNull(string? input)
    {
        Assert.Null(_parser.Parse(input));
    }

    [Theory]
    [InlineData(90, "1h 30m")]
    [InlineData(120, "2h")]
    [InlineData(45, "45m")]
    [InlineData(60, "1h")]
    [InlineData(0, "0m")]
    [InlineData(-5, "0m")]
    public void FormatMinutes_ReturnsExpected(int minutes, string expected)
    {
        Assert.Equal(expected, _parser.FormatMinutes(minutes));
    }
}
