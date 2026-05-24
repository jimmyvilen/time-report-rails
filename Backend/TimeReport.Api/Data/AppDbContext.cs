using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TimeReport.Api.Data.Entities;

namespace TimeReport.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<AppTask> Tasks => Set<AppTask>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<DailyNote> DailyNotes => Set<DailyNote>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        base.OnModelCreating(m);

        // Apply snake_case naming to all tables and columns (matches Rails schema)
        foreach (var entity in m.Model.GetEntityTypes())
        {
            var tableName = entity.GetTableName();
            if (tableName is not null)
                entity.SetTableName(ToSnakeCase(tableName));

            foreach (var prop in entity.GetProperties())
            {
                var colName = prop.GetColumnName();
                if (colName is not null)
                    prop.SetColumnName(ToSnakeCase(colName));
            }
        }

        // Users
        m.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique()
            .HasDatabaseName("users_email_key");

        // Projects
        m.Entity<Project>()
            .HasIndex(p => new { p.UserId, p.Name })
            .IsUnique()
            .HasDatabaseName("index_projects_on_user_id_and_name");

        m.Entity<Project>()
            .HasOne(p => p.User)
            .WithMany(u => u.Projects)
            .OnDelete(DeleteBehavior.Cascade);

        m.Entity<Project>()
            .HasMany(p => p.Tasks)
            .WithOne(t => t.Project)
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        // Tasks (AppTask maps to "tasks" via [Table] attribute)
        m.Entity<AppTask>()
            .HasIndex(t => t.UserId)
            .HasDatabaseName("tasks_user_id_idx");

        m.Entity<AppTask>()
            .HasOne(t => t.User)
            .WithMany(u => u.Tasks)
            .OnDelete(DeleteBehavior.Cascade);

        // TimeEntries
        m.Entity<TimeEntry>()
            .HasIndex(e => e.UserId)
            .HasDatabaseName("time_entries_user_id_idx");

        m.Entity<TimeEntry>()
            .HasIndex(e => e.TaskId)
            .HasDatabaseName("time_entries_task_id_idx");

        m.Entity<TimeEntry>()
            .HasIndex(e => new { e.UserId, e.Date, e.Position })
            .HasDatabaseName("time_entries_user_id_date_position_idx");

        m.Entity<TimeEntry>()
            .HasOne(e => e.User)
            .WithMany(u => u.TimeEntries)
            .OnDelete(DeleteBehavior.Cascade);

        m.Entity<TimeEntry>()
            .HasOne(e => e.Task)
            .WithMany(t => t.TimeEntries)
            .HasForeignKey(e => e.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        // DailyNotes
        m.Entity<DailyNote>()
            .HasIndex(n => new { n.UserId, n.Date })
            .IsUnique()
            .HasDatabaseName("daily_notes_user_id_date_key");

        m.Entity<DailyNote>()
            .HasOne(n => n.User)
            .WithMany(u => u.DailyNotes)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static string ToSnakeCase(string name) =>
        Regex.Replace(name, "([a-z0-9])([A-Z])", "$1_$2").ToLower();
}
