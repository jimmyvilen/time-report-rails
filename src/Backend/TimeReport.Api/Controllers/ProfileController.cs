using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeReport.Api.Data;

namespace TimeReport.Api.Controllers;

[Route("api/profile")]
public class ProfileController(AppDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == CurrentUserId);
        return user is null ? NotFound() : Ok(ToDto(user));
    }

    [HttpPatch]
    public async Task<IActionResult> Update([FromBody] ProfileRequest req)
    {
        var user = await db.Users.FindAsync(CurrentUserId);
        if (user is null) return NotFound();

        if (!string.IsNullOrEmpty(req.Password))
        {
            if (req.Password != req.PasswordConfirmation)
                return BadRequest(new { error = "Passwords do not match" });
            if (req.Password.Length < 8)
                return BadRequest(new { error = "Password must be at least 8 characters" });
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 12);
        }

        if (req.Name != null) user.Name = req.Name.Trim();
        if (req.AvatarUrl != null) user.AvatarUrl = string.IsNullOrEmpty(req.AvatarUrl) ? null : req.AvatarUrl.Trim();
        if (req.JiraUrl != null) user.JiraUrl = string.IsNullOrEmpty(req.JiraUrl) ? null : req.JiraUrl.Trim();
        if (req.JiraEmail != null) user.JiraEmail = string.IsNullOrEmpty(req.JiraEmail) ? null : req.JiraEmail.Trim();
        if (req.JiraApiToken != null) user.JiraApiToken = string.IsNullOrEmpty(req.JiraApiToken) ? null : req.JiraApiToken.Trim();
        if (req.JiraIntegrationSystem != null) user.JiraIntegrationSystem = req.JiraIntegrationSystem;

        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    private static object ToDto(Data.Entities.User u) => new
    {
        u.Id, u.Email, u.Name, u.IsAdmin, u.AvatarUrl,
        u.JiraUrl, u.JiraEmail,
        JiraApiTokenSet = !string.IsNullOrEmpty(u.JiraApiToken),
        u.JiraIntegrationSystem
    };
}

public record ProfileRequest(
    string? Name,
    string? AvatarUrl,
    string? JiraUrl,
    string? JiraEmail,
    string? JiraApiToken,
    string? JiraIntegrationSystem,
    string? Password,
    string? PasswordConfirmation);
