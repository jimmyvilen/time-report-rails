namespace TimeReport.Api.Data.Entities;

public class Project
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public bool IsArchived { get; set; } = false;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<AppTask> Tasks { get; set; } = [];
}
