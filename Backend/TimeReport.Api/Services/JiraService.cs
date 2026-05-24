using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace TimeReport.Api.Services;

public class JiraService(IHttpClientFactory factory)
{
    public async Task<JiraIssue> FetchIssue(string jiraBaseUrl, string jiraEmail, string jiraApiToken, string issueKey)
    {
        var client = CreateClient(jiraBaseUrl, jiraEmail, jiraApiToken);
        var response = await client.GetAsync($"/rest/api/3/issue/{issueKey}?fields=summary,description");
        await EnsureSuccess(response, issueKey);

        var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var fields = doc.RootElement.GetProperty("fields");
        var summary = fields.GetProperty("summary").GetString() ?? "";
        var description = fields.TryGetProperty("description", out var desc)
            ? ExtractAdfText(desc)
            : null;

        return new JiraIssue(summary, description);
    }

    public async Task<string> CreateWorklog(
        string jiraBaseUrl, string jiraEmail, string jiraApiToken,
        string issueKey, int timeSpentSeconds, DateTime started, string? comment)
    {
        var client = CreateClient(jiraBaseUrl, jiraEmail, jiraApiToken);

        var bodyNode = new JsonObject
        {
            ["timeSpentSeconds"] = timeSpentSeconds,
            ["started"] = FormatWorklogDate(started)
        };

        if (!string.IsNullOrEmpty(comment))
        {
            bodyNode["comment"] = new JsonObject
            {
                ["type"] = "doc",
                ["version"] = 1,
                ["content"] = new JsonArray(
                    new JsonObject
                    {
                        ["type"] = "paragraph",
                        ["content"] = new JsonArray(
                            new JsonObject { ["type"] = "text", ["text"] = comment })
                    })
            };
        }

        var json = bodyNode.ToJsonString();
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"/rest/api/3/issue/{issueKey}/worklog", content);
        await EnsureSuccess(response, issueKey);

        var result = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return result.RootElement.GetProperty("id").GetString()!;
    }

    public async System.Threading.Tasks.Task DeleteWorklog(
        string jiraBaseUrl, string jiraEmail, string jiraApiToken,
        string issueKey, string worklogId)
    {
        var client = CreateClient(jiraBaseUrl, jiraEmail, jiraApiToken);
        var response = await client.DeleteAsync($"/rest/api/3/issue/{issueKey}/worklog/{worklogId}");
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return;
        await EnsureSuccess(response, issueKey);
    }

    public static string? ExtractIssueKey(string? jiraUrl)
    {
        if (string.IsNullOrEmpty(jiraUrl)) return null;
        try
        {
            var uri = new Uri(jiraUrl);
            var segment = uri.AbsolutePath.TrimEnd('/').Split('/').LastOrDefault();
            return string.IsNullOrEmpty(segment) ? null : segment;
        }
        catch { return null; }
    }

    public static string FormatWorklogDate(DateTime utc) =>
        utc.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fff+0000");

    private HttpClient CreateClient(string jiraBaseUrl, string jiraEmail, string jiraApiToken)
    {
        var client = factory.CreateClient();
        client.BaseAddress = new Uri(jiraBaseUrl.TrimEnd('/'));
        var token = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{jiraEmail}:{jiraApiToken}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", token);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return client;
    }

    private static async System.Threading.Tasks.Task EnsureSuccess(HttpResponseMessage response, string issueKey)
    {
        if (response.IsSuccessStatusCode) return;

        var msg = (int)response.StatusCode switch
        {
            401 => "Jira authentication failed – check your email and API token",
            403 => $"Not authorized to access issue {issueKey}",
            404 => $"Issue {issueKey} not found or inaccessible",
            >= 500 => "Jira is unavailable, try again later",
            _ => $"Jira returned {(int)response.StatusCode}"
        };
        throw new JiraException(msg, (int)response.StatusCode);
    }

    private static string ExtractAdfText(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Null) return "";
        var sb = new StringBuilder();
        ExtractText(element, sb);
        return sb.ToString().Trim();
    }

    private static void ExtractText(JsonElement el, StringBuilder sb)
    {
        if (el.ValueKind == JsonValueKind.Object)
        {
            if (el.TryGetProperty("type", out var t) && t.GetString() == "text" &&
                el.TryGetProperty("text", out var text))
            {
                sb.Append(text.GetString());
                return;
            }
            if (el.TryGetProperty("content", out var content))
                ExtractText(content, sb);
        }
        else if (el.ValueKind == JsonValueKind.Array)
        {
            foreach (var child in el.EnumerateArray())
            {
                ExtractText(child, sb);
                if (child.TryGetProperty("type", out var t2) && t2.GetString() == "paragraph")
                    sb.Append('\n');
            }
        }
    }
}

public record JiraIssue(string Summary, string? Description);

public class JiraException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
