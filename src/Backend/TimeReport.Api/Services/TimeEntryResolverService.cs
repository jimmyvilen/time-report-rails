namespace TimeReport.Api.Services;

public class TimeEntryResolverService
{
    public record Resolved(DateTime? StartTime, DateTime? EndTime, int? DurationMinutes);

    public Resolved Resolve(string dateStr, DateTime? start, DateTime? end, int? durationMinutes)
    {
        if (start.HasValue && end.HasValue)
        {
            int diff = (int)Math.Round((end.Value - start.Value).TotalMinutes);
            if (diff <= 0) throw new ArgumentException("End time must be after start time");
            ValidateOnDate(dateStr, start, end);
            return new(start, end, diff);
        }

        if (start.HasValue && durationMinutes > 0)
        {
            var end2 = start.Value.AddMinutes(durationMinutes.Value);
            ValidateOnDate(dateStr, start, end2);
            return new(start, end2, durationMinutes);
        }

        if (end.HasValue && durationMinutes > 0)
        {
            var start2 = end.Value.AddMinutes(-durationMinutes.Value);
            ValidateOnDate(dateStr, start2, end);
            return new(start2, end, durationMinutes);
        }

        if (!start.HasValue && !end.HasValue && durationMinutes > 0)
            return new(null, null, durationMinutes);

        if (!start.HasValue && !end.HasValue)
            throw new ArgumentException("Provide duration or start/end time");

        if (start.HasValue)
            return new(start, null, null);

        return new(null, end, null);
    }

    private static void ValidateOnDate(string dateStr, DateTime? s, DateTime? e)
    {
        foreach (var t in new[] { s, e })
        {
            if (t.HasValue && t.Value.ToString("yyyy-MM-dd") != dateStr)
                throw new ArgumentException($"Time {t.Value:HH:mm} does not fall on date {dateStr}");
        }
    }
}
