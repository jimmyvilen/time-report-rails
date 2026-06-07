using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeReport.Api.Data;
using TimeReport.Api.Data.Entities;

namespace TimeReport.Api.Controllers;

[Route("api/planner-blocks")]
public class PlannerBlocksController(AppDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string weekStart)
    {
        if (!DateOnly.TryParse(weekStart, out var start))
            return BadRequest(new { error = "Invalid weekStart date" });

        var startStr = start.ToString("yyyy-MM-dd");
        var endStr = start.AddDays(6).ToString("yyyy-MM-dd");

        var blocks = await db.PlannerBlocks
            .Where(b => b.UserId == CurrentUserId
                && string.Compare(b.Date, startStr) >= 0
                && string.Compare(b.Date, endStr) <= 0)
            .OrderBy(b => b.Date)
            .ThenBy(b => b.StartTime)
            .AsNoTracking()
            .ToListAsync();

        return Ok(blocks.Select(ToDto));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PlannerBlockRequest req)
    {
        var block = new PlannerBlock
        {
            UserId = CurrentUserId,
            Date = req.Date,
            Title = req.Title.Trim(),
            StartTime = req.StartTime,
            EndTime = req.EndTime,
            Color = req.Color,
            Notes = req.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.PlannerBlocks.Add(block);
        await db.SaveChangesAsync();
        return Ok(ToDto(block));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] PlannerBlockRequest req)
    {
        var block = await db.PlannerBlocks
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == CurrentUserId);
        if (block is null) return NotFound();

        block.Title = req.Title.Trim();
        block.Date = req.Date;
        block.StartTime = req.StartTime;
        block.EndTime = req.EndTime;
        block.Color = req.Color;
        block.Notes = req.Notes;
        block.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(block));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Destroy(int id)
    {
        var block = await db.PlannerBlocks
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == CurrentUserId);
        if (block is null) return NotFound();

        db.PlannerBlocks.Remove(block);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static object ToDto(PlannerBlock b) => new
    {
        b.Id, b.Title, b.Date, b.StartTime, b.EndTime, b.Color, b.Notes,
        b.CreatedAt, b.UpdatedAt,
    };
}

public record PlannerBlockRequest(
    string Title,
    string Date,
    DateTime? StartTime,
    DateTime? EndTime,
    string? Color,
    string? Notes
);
