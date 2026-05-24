namespace TimeReport.Api.Data.Entities;

public class TimeEntry
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int TaskId { get; set; }
    public string Date { get; set; } = "";
    public string? Description { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? DurationMinutes { get; set; }
    public int Position { get; set; } = 0;
    public string? JiraWorklogId { get; set; }
    public string? PushedToSystem { get; set; }
    public DateTime? PushedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public AppTask Task { get; set; } = null!;

    public int EffectiveDurationMinutes =>
        StartTime.HasValue && EndTime.HasValue
            ? (int)Math.Round((EndTime.Value - StartTime.Value).TotalMinutes)
            : DurationMinutes ?? 0;

    public bool IsPushed => !string.IsNullOrEmpty(PushedToSystem);
}
