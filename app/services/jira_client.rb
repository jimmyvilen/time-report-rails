require "faraday"
require "base64"

class JiraClient
  def initialize(jira_url:, jira_email:, jira_api_token:)
    @base_url   = jira_url.to_s.chomp("/")
    @auth_token = Base64.strict_encode64("#{jira_email}:#{jira_api_token}")
  end

  def fetch_issue(issue_key)
    response = connection.get("/rest/api/3/issue/#{issue_key}")
    data = JSON.parse(response.body)
    {
      summary:     data.dig("fields", "summary").to_s,
      description: extract_adf_text(data.dig("fields", "description"))
    }
  rescue JSON::ParserError
    raise ArgumentError, "Ogiltigt svar från Jira."
  rescue Faraday::Error, SocketError, SystemCallError => e
    raise ArgumentError, jira_error_message(e.respond_to?(:response) ? e.response&.dig(:status) : nil, issue_key)
  end

  def create_worklog(issue_key:, time_spent_seconds:, started:, comment: nil)
    body = { timeSpentSeconds: time_spent_seconds, started: started }
    if comment.present?
      body[:comment] = {
        type: "doc", version: 1,
        content: [ { type: "paragraph", content: [ { type: "text", text: comment } ] } ]
      }
    end
    response = connection.post("/rest/api/3/issue/#{issue_key}/worklog") do |req|
      req.body = body.to_json
    end
    JSON.parse(response.body)
  rescue JSON::ParserError
    raise ArgumentError, "Ogiltigt svar från Jira."
  rescue Faraday::Error, SocketError, SystemCallError => e
    raise ArgumentError, jira_error_message(e.respond_to?(:response) ? e.response&.dig(:status) : nil, issue_key)
  end

  def delete_worklog(issue_key:, worklog_id:)
    connection.delete("/rest/api/3/issue/#{issue_key}/worklog/#{worklog_id}")
  rescue Faraday::Error, SocketError, SystemCallError => e
    raise ArgumentError, jira_error_message(e.respond_to?(:response) ? e.response&.dig(:status) : nil, issue_key)
  end

  def self.format_worklog_date(time)
    utc = time.utc
    utc.strftime("%Y-%m-%dT%H:%M:%S.") + utc.strftime("%L") + "+0000"
  end

  def self.extract_issue_key(jira_url)
    return nil if jira_url.blank?
    uri = URI.parse(jira_url.strip.chomp("/"))
    last = uri.path.split("/").last
    last.to_s.split("?").first.presence
  rescue URI::InvalidURIError
    nil
  end

  private

  def connection
    @connection ||= Faraday.new(url: @base_url) do |f|
      f.headers["Authorization"] = "Basic #{@auth_token}"
      f.headers["Content-Type"]  = "application/json"
      f.headers["Accept"]        = "application/json"
      f.response :raise_error
    end
  end

  def jira_error_message(status, issue_key)
    case status
    when 401 then "Jira-autentisering misslyckades. Kontrollera dina Jira-inställningar."
    when 403 then "Du har inte behörighet att logga tid på denna issue."
    when 404 then "Jira-issue #{issue_key} hittades inte eller så saknar du behörighet att se den."
    when 500..599 then "Jira är inte tillgängligt just nu. Försök igen senare."
    when nil then "Kunde inte ansluta till Jira. Kontrollera Jira-URL och nätverk."
    else "Jira API-fel: #{status}"
    end
  end

  def extract_adf_text(adf)
    return "" unless adf.is_a?(Hash)
    texts = []
    traverse_adf(adf, texts)
    texts.join("").strip
  end

  def traverse_adf(node, texts)
    texts << node["text"] if node["type"] == "text" && node["text"]
    (node["content"] || []).each { |child| traverse_adf(child, texts) }
  end
end
