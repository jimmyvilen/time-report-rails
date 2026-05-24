namespace TimeReport.Api.Data.Entities;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string? PasswordHash { get; set; }
    public string? Name { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsAdmin { get; set; }
    public string? JiraUrl { get; set; }
    public string? JiraEmail { get; set; }
    public string? JiraApiToken { get; set; }
    public string JiraIntegrationSystem { get; set; } = "JIRA_CLOUD";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Project> Projects { get; set; } = [];
    public ICollection<AppTask> Tasks { get; set; } = [];
    public ICollection<TimeEntry> TimeEntries { get; set; } = [];
    public ICollection<DailyNote> DailyNotes { get; set; } = [];
}
