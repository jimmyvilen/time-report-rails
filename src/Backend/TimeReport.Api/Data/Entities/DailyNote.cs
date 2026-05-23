namespace TimeReport.Api.Data.Entities;

public class DailyNote
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Date { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
}
