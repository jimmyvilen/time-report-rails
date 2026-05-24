using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeReport.Api.Data;
using TimeReport.Api.Data.Entities;
using TimeReport.Api.Services;

namespace TimeReport.Api.Controllers;

[Route("api/projects")]
public class ProjectsController(AppDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Index()
    {
        var projects = await db.Projects
            .Where(p => p.UserId == CurrentUserId)
            .AsNoTracking()
            .Include(p => p.Tasks)
                .ThenInclude(t => t.TimeEntries)
            .OrderBy(p => p.Name)
            .ToListAsync();

        return Ok(projects.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Show(int id)
    {
        var project = await db.Projects
            .Where(p => p.UserId == CurrentUserId && p.Id == id)
            .AsNoTracking()
            .Include(p => p.Tasks.Where(t => !t.IsArchived))
                .ThenInclude(t => t.TimeEntries)
            .FirstOrDefaultAsync();

        if (project is null) return NotFound();

        var unassigned = await db.Tasks
            .Where(t => t.UserId == CurrentUserId && t.ProjectId == null && !t.IsArchived)
            .AsNoTracking()
            .OrderByDescending(t => t.IsFavorite)
            .ThenByDescending(t => t.LastUsedAt)
            .ToListAsync();

        return Ok(new
        {
            project = ToDto(project),
            unassignedTasks = unassigned.Select(TaskDto)
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProjectRequest req)
    {
        var nameLower = req.Name.Trim().ToLower();
        if (await db.Projects.AnyAsync(p => p.UserId == CurrentUserId && p.Name.ToLower() == nameLower))
            return BadRequest(new { error = "A project with that name already exists" });

        var project = new Project
        {
            UserId = CurrentUserId,
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        return Ok(ToDto(project));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] ProjectRequest req)
    {
        var project = await FindOwned(id);
        if (project is null) return NotFound();

        var nameLower = req.Name.Trim().ToLower();
        if (await db.Projects.AnyAsync(p => p.UserId == CurrentUserId && p.Id != id && p.Name.ToLower() == nameLower))
            return BadRequest(new { error = "A project with that name already exists" });

        project.Name = req.Name.Trim();
        project.Description = req.Description?.Trim();
        project.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(project));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Destroy(int id)
    {
        var project = await FindOwned(id);
        if (project is null) return NotFound();
        db.Projects.Remove(project);
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPatch("{id:int}/archive")]
    public async Task<IActionResult> Archive(int id)
    {
        var project = await FindOwned(id);
        if (project is null) return NotFound();
        project.IsArchived = true;
        project.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(project));
    }

    [HttpPatch("{id:int}/unarchive")]
    public async Task<IActionResult> Unarchive(int id)
    {
        var project = await FindOwned(id);
        if (project is null) return NotFound();
        project.IsArchived = false;
        project.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(project));
    }

    [HttpPatch("{id:int}/add-task")]
    public async Task<IActionResult> AddTask(int id, [FromBody] TaskAssignRequest req)
    {
        var project = await FindOwned(id);
        if (project is null) return NotFound();

        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == req.TaskId && t.UserId == CurrentUserId);
        if (task is null) return NotFound();

        task.ProjectId = id;
        task.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPatch("{id:int}/remove-task")]
    public async Task<IActionResult> RemoveTask(int id, [FromBody] TaskAssignRequest req)
    {
        var project = await FindOwned(id);
        if (project is null) return NotFound();

        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == req.TaskId && t.UserId == CurrentUserId);
        if (task is null) return NotFound();

        task.ProjectId = null;
        task.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }

    private async Task<Project?> FindOwned(int id) =>
        await db.Projects.FirstOrDefaultAsync(p => p.Id == id && p.UserId == CurrentUserId);

    private static object ToDto(Project p)
    {
        var totalMinutes = p.Tasks.SelectMany(t => t.TimeEntries).Sum(e =>
            e.StartTime.HasValue && e.EndTime.HasValue
                ? (int)Math.Round((e.EndTime.Value - e.StartTime.Value).TotalMinutes)
                : e.DurationMinutes ?? 0);

        return new
        {
            p.Id, p.Name, p.Description, p.IsArchived,
            p.UserId, p.CreatedAt, p.UpdatedAt,
            TaskCount = p.Tasks.Count(t => !t.IsArchived),
            TotalMinutes = totalMinutes
        };
    }

    private static object TaskDto(AppTask t) => new
    {
        t.Id, t.Title, t.Description, t.JiraUrl,
        JiraKey = JiraService.ExtractIssueKey(t.JiraUrl),
        t.ProjectId, t.IsFavorite, t.IsArchived
    };
}

public record ProjectRequest(string Name, string? Description);
public record TaskAssignRequest(int TaskId);
