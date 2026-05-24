using System.Globalization;
using System.Text.RegularExpressions;

namespace TimeReport.Api.Services;

public class DurationParser
{
    private static readonly Regex Pattern =
        new(@"(\d+(?:\.\d+)?)\s*(h|m)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public int? Parse(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;

        var trimmed = raw.Trim().ToLower();
        if (trimmed.StartsWith('-')) return null;

        var matches = Pattern.Matches(trimmed);
        if (matches.Count == 0) return null;

        int total = 0;
        int lastEnd = 0;

        foreach (Match match in matches)
        {
            // Only whitespace allowed between tokens
            if (trimmed[lastEnd..match.Index].Trim().Length > 0) return null;

            if (!double.TryParse(match.Groups[1].Value, NumberStyles.Any,
                CultureInfo.InvariantCulture, out double n)) return null;
            if (double.IsInfinity(n) || n < 0) return null;

            total += match.Groups[2].Value == "h"
                ? (int)Math.Round(n * 60)
                : (int)Math.Round(n);

            lastEnd = match.Index + match.Length;
        }

        // No trailing garbage
        if (trimmed[lastEnd..].Trim().Length > 0) return null;

        return total > 0 ? total : null;
    }

    public string FormatMinutes(int minutes)
    {
        if (minutes <= 0) return "0m";
        int h = minutes / 60;
        int m = minutes % 60;
        return (h > 0, m > 0) switch
        {
            (true, true) => $"{h}h {m}m",
            (true, false) => $"{h}h",
            _ => $"{m}m"
        };
    }
}
