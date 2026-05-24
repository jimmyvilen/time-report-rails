using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeReport.Api.Data;
using TimeReport.Api.Data.Entities;
using TimeReport.Api.Services;

namespace TimeReport.Api.Controllers;

[Route("api/tasks")]
public class TasksController(AppDbContext db, JiraService jira) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Index(
        [FromQuery] string? q,
        [FromQuery] bool includeArchived = false)
    {
        var query = db.Tasks
            .Where(t => t.UserId == CurrentUserId)
            .AsNoTracking()
            .Include(t => t.Project)
            .Include(t => t.TimeEntries)
            .AsQueryable();

        if (!includeArchived)
            query = query.Where(t => !t.IsArchived);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(t =>
                t.Title.ToLower().Contains(term) ||
                (t.Description != null && t.Description.ToLower().Contains(term)) ||
                (t.JiraUrl != null && t.JiraUrl.ToLower().Contains(term)) ||
                (t.Project != null && t.Project.Name.ToLower().Contains(term)));
        }

        var tasks = await query
            .OrderByDescending(t => t.IsFavorite)
            .ThenByDescending(t => t.LastUsedAt)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync();

        return Ok(tasks.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Show(int id)
    {
        var task = await FindOwned(id);
        return task is null ? NotFound() : Ok(ToDto(task));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TaskRequest req)
    {
        if (req.ProjectId.HasValue)
        {
            var projectOwned = await db.Projects.AnyAsync(p => p.Id == req.ProjectId && p.UserId == CurrentUserId);
            if (!projectOwned) return BadRequest(new { error = "Project not found" });
        }

        var task = new AppTask
        {
            UserId = CurrentUserId,
            ProjectId = req.ProjectId,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            JiraUrl = req.JiraUrl?.Trim(),
            IsArchived = false,
            IsFavorite = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        await db.Entry(task).Reference(t => t.Project).LoadAsync();
        return Ok(ToDto(task));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] TaskRequest req)
    {
        var task = await FindOwned(id);
        if (task is null) return NotFound();

        if (req.ProjectId.HasValue && req.ProjectId != task.ProjectId)
        {
            var projectOwned = await db.Projects.AnyAsync(p => p.Id == req.ProjectId && p.UserId == CurrentUserId);
            if (!projectOwned) return BadRequest(new { error = "Project not found" });
        }

        task.Title = req.Title.Trim();
        task.Description = req.Description?.Trim();
        task.JiraUrl = req.JiraUrl?.Trim();
        task.ProjectId = req.ProjectId;
        task.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await db.Entry(task).Reference(t => t.Project).LoadAsync();
        return Ok(ToDto(task));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Destroy(int id)
    {
        var task = await FindOwned(id);
        if (task is null) return NotFound();

        var hasEntries = await db.TimeEntries.AnyAsync(e => e.TaskId == id);
        if (hasEntries)
        {
            task.IsArchived = true;
            task.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Ok(new { archived = true });
        }

        db.Tasks.Remove(task);
        await db.SaveChangesAsync();
        return Ok(new { archived = false });
    }

    [HttpPatch("{id:int}/favorite")]
    public async Task<IActionResult> Favorite(int id)
    {
        var task = await FindOwned(id);
        if (task is null) return NotFound();
        task.IsFavorite = !task.IsFavorite;
        task.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(task));
    }

    [HttpPatch("{id:int}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var task = await FindOwned(id);
        if (task is null) return NotFound();
        task.IsArchived = false;
        task.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(task));
    }

    [HttpGet("jira-details")]
    public async Task<IActionResult> FetchJiraDetails([FromQuery] string jira_url)
    {
        var uid = CurrentUserId;
        var user = await db.Users.FindAsync(uid);
        if (user is null || string.IsNullOrEmpty(user.JiraUrl) ||
            string.IsNullOrEmpty(user.JiraEmail) || string.IsNullOrEmpty(user.JiraApiToken))
            return BadRequest(new { error = "Jira credentials not configured" });

        var issueKey = JiraService.ExtractIssueKey(jira_url);
        if (issueKey is null) return BadRequest(new { error = "Invalid Jira URL" });

        try
        {
            var issue = await jira.FetchIssue(user.JiraUrl, user.JiraEmail, user.JiraApiToken, issueKey);
            return Ok(new { issue.Summary, issue.Description, IssueKey = issueKey });
        }
        catch (JiraException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    private async Task<AppTask?> FindOwned(int id) =>
        await db.Tasks
            .Include(t => t.Project)
            .Include(t => t.TimeEntries)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);

    private static object ToDto(AppTask t) => new
    {
        t.Id, t.Title, t.Description, t.JiraUrl,
        JiraKey = JiraService.ExtractIssueKey(t.JiraUrl),
        t.ProjectId,
        ProjectName = t.Project?.Name,
        t.IsFavorite, t.IsArchived, t.LastUsedAt,
        t.CreatedAt, t.UpdatedAt,
        TimeEntryCount = t.TimeEntries.Count,
        TotalMinutes = t.TimeEntries.Sum(e =>
            e.StartTime.HasValue && e.EndTime.HasValue
                ? (int)Math.Round((e.EndTime.Value - e.StartTime.Value).TotalMinutes)
                : e.DurationMinutes ?? 0)
    };
}

public record TaskRequest(string Title, string? Description, string? JiraUrl, int? ProjectId);
