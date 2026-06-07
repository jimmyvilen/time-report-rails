namespace TimeReport.Api.Data.Entities;

public class PlannerBlock
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Date { get; set; } = "";
    public string Title { get; set; } = "";
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Color { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
}
