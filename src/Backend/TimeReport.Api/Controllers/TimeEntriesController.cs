using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeReport.Api.Data;
using TimeReport.Api.Data.Entities;
using TimeReport.Api.Services;

namespace TimeReport.Api.Controllers;

[Route("api/time-entries")]
public class TimeEntriesController(
    AppDbContext db,
    DurationParser durationParser,
    TimeEntryResolverService resolver,
    JiraService jira) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string date)
    {
        var entries = await db.TimeEntries
            .Where(e => e.UserId == CurrentUserId && e.Date == date)
            .AsNoTracking()
            .Include(e => e.Task).ThenInclude(t => t.Project)
            .OrderBy(e => e.Position)
            .ToListAsync();

        return Ok(entries.Select(ToDto));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TimeEntryRequest req)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == req.TaskId && t.UserId == CurrentUserId);
        if (task is null) return BadRequest(new { error = "Task not found" });

        TimeEntryResolverService.Resolved resolved;
        try
        {
            var startTime = ParseDateTime(req.Date, req.StartTime);
            var endTime = ParseDateTime(req.Date, req.EndTime);
            var duration = req.DurationMinutes ?? durationParser.Parse(req.DurationString);
            resolved = resolver.Resolve(req.Date, startTime, endTime, duration);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        await using var tx = await db.Database.BeginTransactionAsync();
        await db.TimeEntries
            .Where(e => e.UserId == CurrentUserId && e.Date == req.Date)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.Position, e => e.Position + 1));

        var entry = new TimeEntry
        {
            UserId = CurrentUserId,
            TaskId = req.TaskId,
            Date = req.Date,
            Description = req.Description?.Trim(),
            StartTime = resolved.StartTime,
            EndTime = resolved.EndTime,
            DurationMinutes = resolved.DurationMinutes,
            Position = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.TimeEntries.Add(entry);

        task.LastUsedAt = DateTime.UtcNow;
        task.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await db.Entry(entry).Reference(e => e.Task).LoadAsync();
        await db.Entry(entry.Task).Reference(t => t.Project).LoadAsync();
        return Ok(ToDto(entry));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] TimeEntryUpdateRequest req)
    {
        var entry = await db.TimeEntries
            .Include(e => e.Task)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == CurrentUserId);
        if (entry is null) return NotFound();

        if (req.TaskId.HasValue && req.TaskId != entry.TaskId)
        {
            var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == req.TaskId && t.UserId == CurrentUserId);
            if (task is null) return BadRequest(new { error = "Task not found" });
        }

        if (req.DeleteJiraWorklog && !string.IsNullOrEmpty(entry.JiraWorklogId))
        {
            var user = await db.Users.FindAsync(CurrentUserId);
            if (user?.JiraUrl != null && user.JiraEmail != null && user.JiraApiToken != null)
            {
                var issueKey = JiraService.ExtractIssueKey(entry.Task.JiraUrl);
                if (issueKey != null)
                {
                    try { await jira.DeleteWorklog(user.JiraUrl, user.JiraEmail, user.JiraApiToken, issueKey, entry.JiraWorklogId); }
                    catch (JiraException) { /* best effort */ }
                }
            }
            entry.JiraWorklogId = null;
            entry.PushedToSystem = null;
            entry.PushedAt = null;
        }

        TimeEntryResolverService.Resolved resolved;
        try
        {
            var startTime = ParseDateTime(req.Date ?? entry.Date, req.StartTime);
            var endTime = ParseDateTime(req.Date ?? entry.Date, req.EndTime);
            var duration = req.DurationMinutes ?? durationParser.Parse(req.DurationString);
            resolved = resolver.Resolve(req.Date ?? entry.Date, startTime, endTime, duration);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        if (req.TaskId.HasValue) entry.TaskId = req.TaskId.Value;
        if (req.Date != null) entry.Date = req.Date;
        entry.Description = req.Description?.Trim();
        entry.StartTime = resolved.StartTime;
        entry.EndTime = resolved.EndTime;
        entry.DurationMinutes = resolved.DurationMinutes;
        entry.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        await db.Entry(entry).Reference(e => e.Task).LoadAsync();
        await db.Entry(entry.Task).Reference(t => t.Project).LoadAsync();
        return Ok(ToDto(entry));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Destroy(int id)
    {
        var entry = await db.TimeEntries.FirstOrDefaultAsync(e => e.Id == id && e.UserId == CurrentUserId);
        if (entry is null) return NotFound();
        db.TimeEntries.Remove(entry);
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("{id:int}/duplicate")]
    public async Task<IActionResult> Duplicate(int id)
    {
        var original = await db.TimeEntries
            .Include(e => e.Task).ThenInclude(t => t.Project)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == CurrentUserId);
        if (original is null) return NotFound();

        await using var tx = await db.Database.BeginTransactionAsync();
        await db.TimeEntries
            .Where(e => e.UserId == CurrentUserId && e.Date == original.Date && e.Position > original.Position)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.Position, e => e.Position + 1));

        var copy = new TimeEntry
        {
            UserId = original.UserId,
            TaskId = original.TaskId,
            Date = original.Date,
            Description = original.Description,
            StartTime = original.StartTime,
            EndTime = original.EndTime,
            DurationMinutes = original.DurationMinutes,
            Position = original.Position + 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.TimeEntries.Add(copy);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await db.Entry(copy).Reference(e => e.Task).LoadAsync();
        await db.Entry(copy.Task).Reference(t => t.Project).LoadAsync();
        return Ok(ToDto(copy));
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder([FromBody] List<ReorderItem> items)
    {
        var ids = items.Select(i => i.Id).ToList();
        var entries = await db.TimeEntries
            .Where(e => ids.Contains(e.Id) && e.UserId == CurrentUserId)
            .ToListAsync();

        foreach (var item in items)
        {
            var entry = entries.FirstOrDefault(e => e.Id == item.Id);
            if (entry != null) entry.Position = item.Position;
        }
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("weekly-summary")]
    public async Task<IActionResult> WeeklySummary([FromQuery] string date)
    {
        if (!DateOnly.TryParse(date, out var parsed))
            return BadRequest(new { error = "Invalid date" });

        var dayOfWeek = (int)parsed.DayOfWeek;
        var offset = dayOfWeek == 0 ? 6 : dayOfWeek - 1;
        var monday = parsed.AddDays(-offset);
        var sunday = monday.AddDays(6);

        var mondayStr = monday.ToString("yyyy-MM-dd");
        var sundayStr = sunday.ToString("yyyy-MM-dd");

        var entries = await db.TimeEntries
            .Where(e => e.UserId == CurrentUserId &&
                        string.Compare(e.Date, mondayStr) >= 0 &&
                        string.Compare(e.Date, sundayStr) <= 0)
            .AsNoTracking()
            .ToListAsync();

        var days = Enumerable.Range(0, 7).Select(i =>
        {
            var day = monday.AddDays(i);
            var dayStr = day.ToString("yyyy-MM-dd");
            var dayEntries = entries.Where(e => e.Date == dayStr).ToList();
            var totalMinutes = dayEntries.Sum(e => e.EffectiveDurationMinutes);

            var startTimes = dayEntries.Where(e => e.StartTime.HasValue).Select(e => e.StartTime!.Value).ToList();
            var endTimes = dayEntries.Where(e => e.EndTime.HasValue).Select(e => e.EndTime!.Value).ToList();

            return new
            {
                Date = dayStr,
                DayName = day.DayOfWeek.ToString(),
                FirstStart = startTimes.Count > 0 ? startTimes.Min().ToString("HH:mm") : (string?)null,
                LastEnd = endTimes.Count > 0 ? endTimes.Max().ToString("HH:mm") : (string?)null,
                TotalMinutes = totalMinutes
            };
        }).ToList();

        var weekNumber = ISOWeek.GetWeekOfYear(monday.ToDateTime(TimeOnly.MinValue));

        return Ok(new
        {
            WeekNumber = weekNumber,
            TotalMinutes = days.Sum(d => d.TotalMinutes),
            Days = days
        });
    }

    [HttpGet("recent-description")]
    public async Task<IActionResult> RecentDescription([FromQuery] int task_id)
    {
        var entry = await db.TimeEntries
            .Where(e => e.TaskId == task_id && e.UserId == CurrentUserId && !string.IsNullOrEmpty(e.Description))
            .AsNoTracking()
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync();

        return Ok(new { description = entry?.Description });
    }

    [HttpPost("{id:int}/push-to-jira")]
    public async Task<IActionResult> PushToJira(int id)
    {
        var entry = await db.TimeEntries
            .Include(e => e.Task)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == CurrentUserId);
        if (entry is null) return NotFound();

        if (entry.EffectiveDurationMinutes <= 0)
            return BadRequest(new { error = "Entry has no duration" });
        if (!entry.StartTime.HasValue || !entry.EndTime.HasValue)
            return BadRequest(new { error = "Entry requires start and end time to push to Jira" });
        if (string.IsNullOrEmpty(entry.Task.JiraUrl))
            return BadRequest(new { error = "Task has no Jira URL" });

        var issueKey = JiraService.ExtractIssueKey(entry.Task.JiraUrl);
        if (issueKey is null) return BadRequest(new { error = "Could not extract Jira issue key" });

        var user = await db.Users.FindAsync(CurrentUserId);
        if (user?.JiraUrl == null || user.JiraEmail == null || user.JiraApiToken == null)
            return BadRequest(new { error = "Jira credentials not configured" });

        try
        {
            var seconds = entry.EffectiveDurationMinutes * 60;
            var worklogId = await jira.CreateWorklog(
                user.JiraUrl, user.JiraEmail, user.JiraApiToken,
                issueKey, seconds, entry.StartTime.Value, entry.Description);

            entry.JiraWorklogId = worklogId;
            entry.PushedToSystem = user.JiraIntegrationSystem;
            entry.PushedAt = DateTime.UtcNow;
            entry.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await db.Entry(entry).Reference(e => e.Task).LoadAsync();
            await db.Entry(entry.Task).Reference(t => t.Project).LoadAsync();
            return Ok(ToDto(entry));
        }
        catch (JiraException ex)
        {
            return StatusCode(ex.StatusCode, new { error = ex.Message });
        }
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string? from, [FromQuery] string? to)
    {
        var query = db.TimeEntries
            .Where(e => e.UserId == CurrentUserId)
            .AsNoTracking()
            .Include(e => e.Task).ThenInclude(t => t.Project)
            .AsQueryable();

        if (!string.IsNullOrEmpty(from))
            query = query.Where(e => string.Compare(e.Date, from) >= 0);
        if (!string.IsNullOrEmpty(to))
            query = query.Where(e => string.Compare(e.Date, to) <= 0);

        var entries = await query.OrderBy(e => e.Date).ThenBy(e => e.Position).ToListAsync();

        var csv = new StringBuilder();
        csv.AppendLine("Datum,Projekt,Uppgift,Beskrivning,Start,Slut,Minuter");
        foreach (var e in entries)
        {
            var project = e.Task.Project?.Name ?? "";
            var start = e.StartTime?.ToString("HH:mm") ?? "";
            var end = e.EndTime?.ToString("HH:mm") ?? "";
            csv.AppendLine($"{e.Date},{CsvEscape(project)},{CsvEscape(e.Task.Title)},{CsvEscape(e.Description ?? "")},{start},{end},{e.EffectiveDurationMinutes}");
        }

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        var filename = $"tidrapport_{from ?? "all"}_{to ?? "all"}.csv";
        return File(bytes, "text/csv; charset=utf-8", filename);
    }

    private static DateTime? ParseDateTime(string date, string? time)
    {
        if (string.IsNullOrEmpty(time)) return null;
        if (DateTime.TryParse($"{date}T{time}", null, DateTimeStyles.AssumeLocal, out var dt))
            return dt;
        return null;
    }

    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    private static object ToDto(TimeEntry e) => new
    {
        e.Id, e.Date, e.Description, e.Position,
        e.TaskId,
        TaskTitle = e.Task.Title,
        TaskJiraUrl = e.Task.JiraUrl,
        TaskJiraKey = JiraService.ExtractIssueKey(e.Task.JiraUrl),
        ProjectId = e.Task.ProjectId,
        ProjectName = e.Task.Project?.Name,
        StartTime = e.StartTime?.ToString("HH:mm"),
        EndTime = e.EndTime?.ToString("HH:mm"),
        e.DurationMinutes,
        EffectiveDurationMinutes = e.EffectiveDurationMinutes,
        e.JiraWorklogId,
        e.PushedToSystem,
        e.PushedAt,
        IsPushed = e.IsPushed,
        e.CreatedAt, e.UpdatedAt
    };
}

public record TimeEntryRequest(
    int TaskId,
    string Date,
    string? Description,
    string? StartTime,
    string? EndTime,
    int? DurationMinutes,
    string? DurationString);

public record TimeEntryUpdateRequest(
    int? TaskId,
    string? Date,
    string? Description,
    string? StartTime,
    string? EndTime,
    int? DurationMinutes,
    string? DurationString,
    bool DeleteJiraWorklog = false);

public record ReorderItem(int Id, int Position);
