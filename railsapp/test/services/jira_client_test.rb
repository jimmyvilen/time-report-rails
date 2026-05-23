require "test_helper"

class JiraClientTest < ActiveSupport::TestCase
  test "turns connection failures into user-facing argument errors" do
    client = JiraClient.new(
      jira_url: "https://jira.example.com",
      jira_email: "user@example.com",
      jira_api_token: "token"
    )

    connection = Object.new
    connection.define_singleton_method(:get) do |_path|
      raise Faraday::ConnectionFailed, "connection failed"
    end

    client.singleton_class.define_method(:connection) { connection }

    error = assert_raises(ArgumentError) { client.fetch_issue("PROJ-1") }
    assert_equal "Kunde inte ansluta till Jira. Kontrollera Jira-URL och nätverk.", error.message
  end

  test "deletes worklog by issue key and worklog id" do
    client = JiraClient.new(
      jira_url: "https://jira.example.com",
      jira_email: "user@example.com",
      jira_api_token: "token"
    )
    deleted_path = nil

    connection = Object.new
    connection.define_singleton_method(:delete) do |path|
      deleted_path = path
    end

    client.singleton_class.define_method(:connection) { connection }
    client.delete_worklog(issue_key: "PROJ-1", worklog_id: "10001")

    assert_equal "/rest/api/3/issue/PROJ-1/worklog/10001", deleted_path
  end

  test "turns delete failures into user-facing argument errors" do
    client = JiraClient.new(
      jira_url: "https://jira.example.com",
      jira_email: "user@example.com",
      jira_api_token: "token"
    )

    connection = Object.new
    connection.define_singleton_method(:delete) do |_path|
      raise Faraday::ConnectionFailed, "connection failed"
    end

    client.singleton_class.define_method(:connection) { connection }

    error = assert_raises(ArgumentError) do
      client.delete_worklog(issue_key: "PROJ-1", worklog_id: "10001")
    end
    assert_equal "Kunde inte ansluta till Jira. Kontrollera Jira-URL och nätverk.", error.message
  end
end
