using System.ComponentModel.DataAnnotations.Schema;

namespace TimeReport.Api.Data.Entities;

[Table("tasks")]
public class AppTask
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? ProjectId { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public bool IsArchived { get; set; } = false;
    public bool IsFavorite { get; set; } = false;
    public string? JiraUrl { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public Project? Project { get; set; }
    public ICollection<TimeEntry> TimeEntries { get; set; } = [];
}
