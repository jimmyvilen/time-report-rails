using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeReport.Api.Data;
using TimeReport.Api.Data.Entities;

namespace TimeReport.Api.Controllers;

[Route("api/daily-notes")]
public class DailyNotesController(AppDbContext db) : ApiControllerBase
{
    private const int PageSize = 10;

    [HttpGet("{date}")]
    public async Task<IActionResult> Show(string date)
    {
        var note = await db.DailyNotes
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.UserId == CurrentUserId && n.Date == date);
        return Ok(new { content = note?.Content });
    }

    [HttpPut("{date}")]
    public async Task<IActionResult> Upsert(string date, [FromBody] DailyNoteRequest req)
    {
        var note = await db.DailyNotes
            .FirstOrDefaultAsync(n => n.UserId == CurrentUserId && n.Date == date);

        if (note is null)
        {
            note = new DailyNote
            {
                UserId = CurrentUserId,
                Date = date,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.DailyNotes.Add(note);
        }

        note.Content = req.Content;
        note.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { note.Id, note.Date, note.Content, note.UpdatedAt });
    }

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? q, [FromQuery] int page = 1)
    {
        var query = db.DailyNotes
            .Where(n => n.UserId == CurrentUserId)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(n => n.Content.ToLower().Contains(term));
        }

        var total = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)PageSize);
        page = Math.Clamp(page, 1, Math.Max(1, totalPages));

        var notes = await query
            .OrderByDescending(n => n.Date)
            .Skip((page - 1) * PageSize)
            .Take(PageSize)
            .ToListAsync();

        return Ok(new
        {
            notes = notes.Select(n => new { n.Id, n.Date, n.Content, n.UpdatedAt }),
            total,
            totalPages,
            page
        });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string? from, [FromQuery] string? to)
    {
        var query = db.DailyNotes
            .Where(n => n.UserId == CurrentUserId)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrEmpty(from))
            query = query.Where(n => string.Compare(n.Date, from) >= 0);
        if (!string.IsNullOrEmpty(to))
            query = query.Where(n => string.Compare(n.Date, to) <= 0);

        var notes = await query.OrderBy(n => n.Date).ToListAsync();

        var csv = new System.Text.StringBuilder();
        csv.AppendLine("Datum,Notering");
        foreach (var n in notes)
            csv.AppendLine($"{n.Date},{CsvEscape(n.Content)}");

        var bytes = System.Text.Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv; charset=utf-8", $"anteckningar_{from ?? "all"}_{to ?? "all"}.csv");
    }

    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}

public record DailyNoteRequest(string Content);
