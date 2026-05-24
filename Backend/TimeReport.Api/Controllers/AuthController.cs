using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeReport.Api.Data;
using TimeReport.Api.Data.Entities;

namespace TimeReport.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db) : ControllerBase
{
    [HttpGet("setup-status")]
    public async Task<IActionResult> SetupStatus()
    {
        var usersExist = await db.Users.AnyAsync();
        return Ok(new { usersExist });
    }

    [HttpPost("setup")]
    public async Task<IActionResult> Setup([FromBody] SetupRequest req)
    {
        if (await db.Users.AnyAsync())
            return Conflict(new { error = "Setup already completed" });

        if (req.Password != req.PasswordConfirmation)
            return BadRequest(new { error = "Passwords do not match" });

        if (req.Password.Length < 8)
            return BadRequest(new { error = "Password must be at least 8 characters" });

        var user = new User
        {
            Email = req.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 12),
            Name = ExtractNameFromEmail(req.Email),
            IsAdmin = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        await SignIn(user);

        return Ok(ToDto(user));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == req.Email.ToLower().Trim());

        if (user is null || string.IsNullOrEmpty(user.PasswordHash) ||
            !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid email or password" });

        await SignIn(user);
        return Ok(ToDto(user));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok();
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (!await db.Users.AnyAsync())
            return Forbid();

        if (req.Password != req.PasswordConfirmation)
            return BadRequest(new { error = "Passwords do not match" });

        if (req.Password.Length < 8)
            return BadRequest(new { error = "Password must be at least 8 characters" });

        var emailLower = req.Email.ToLower().Trim();
        if (await db.Users.AnyAsync(u => u.Email == emailLower))
            return BadRequest(new { error = "Email already in use" });

        var user = new User
        {
            Email = emailLower,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 12),
            Name = ExtractNameFromEmail(req.Email),
            IsAdmin = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        await SignIn(user);

        return Ok(ToDto(user));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        return user is null ? Unauthorized() : Ok(ToDto(user));
    }

    private async System.Threading.Tasks.Task SignIn(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.Name ?? user.Email)
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));
    }

    private static object ToDto(User u) => new
    {
        u.Id, u.Email, u.Name, u.IsAdmin, u.AvatarUrl,
        u.JiraUrl, u.JiraEmail,
        JiraApiTokenSet = !string.IsNullOrEmpty(u.JiraApiToken),
        u.JiraIntegrationSystem
    };

    private static string ExtractNameFromEmail(string email) =>
        email.Split('@')[0].Replace('.', ' ').Replace('_', ' ');
}

public record SetupRequest(string Email, string Password, string PasswordConfirmation);
public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Email, string Password, string PasswordConfirmation);
