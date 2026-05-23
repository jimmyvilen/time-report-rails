require "test_helper"

class TasksControllerTest < ActionDispatch::IntegrationTest
  test "index filters active and archived tasks by query" do
    user = create_user(email: "task-search@example.com")
    user.tasks.create!(title: "Needle active task", description: "Visible match")
    user.tasks.create!(title: "Needle archived task", description: "Visible match", is_archived: true)
    user.tasks.create!(title: "Unrelated task", description: "Hidden")

    sign_in_as(user)

    get tasks_path(q: "needle")

    assert_response :success
    assert_select "span", text: "Needle active task"
    assert_select "span", text: "Needle archived task"
    assert_select "span", text: "Unrelated task", count: 0
  end

  test "index filters tasks by project name" do
    user = create_user(email: "task-project-search@example.com")
    project = user.projects.create!(name: "Client Portal")
    user.tasks.create!(title: "Project work", project: project)
    user.tasks.create!(title: "Internal work")

    sign_in_as(user)

    get tasks_path(q: "portal")

    assert_response :success
    assert_select "span", text: "Project work"
    assert_select "span", text: "Internal work", count: 0
  end

  test "index search does not show other users tasks" do
    user = create_user(email: "task-search-owner@example.com")
    other = create_user(email: "task-search-other@example.com")
    user.tasks.create!(title: "Needle owned task")
    other.tasks.create!(title: "Needle private task")

    sign_in_as(user)

    get tasks_path(q: "needle")

    assert_response :success
    assert_select "span", text: "Needle owned task"
    assert_select "span", text: "Needle private task", count: 0
  end

  test "index escapes sql wildcards in query" do
    user = create_user(email: "task-wildcards@example.com")
    user.tasks.create!(title: "Literal percent % marker")
    user.tasks.create!(title: "No matching marker")

    sign_in_as(user)

    get tasks_path(q: "%")

    assert_response :success
    assert_select "span", text: "Literal percent % marker"
    assert_select "span", text: "No matching marker", count: 0
  end

  test "rejects assigning a task to another users project" do
    owner = create_user(email: "project-owner@example.com")
    other = create_user(email: "task-owner@example.com")
    foreign_project = owner.projects.create!(name: "Private Project")

    sign_in_as(other)

    assert_no_difference("Task.count") do
      post tasks_path, params: {
        task: {
          title: "Cross-account task",
          project_id: foreign_project.id
        }
      }
    end

    assert_response :unprocessable_entity
  end

  test "fetches jira details with issue summary" do
    user = create_user(email: "jira-task-owner@example.com")
    user.update!(
      jira_url: "https://jira.example.com",
      jira_email: "jira-task-owner@example.com",
      jira_api_token: "token"
    )
    sign_in_as(user)

    requested_issue_key = nil
    client = Object.new
    client.define_singleton_method(:fetch_issue) do |issue_key|
      requested_issue_key = issue_key
      { summary: "Jira task title", description: "Jira task description" }
    end

    original_new = JiraClient.method(:new)
    JiraClient.define_singleton_method(:new) { |**_kwargs| client }
    begin
      get jira_fetch_details_path,
        params: { jira_url: "https://jira.example.com/browse/PROJ-123" },
        as: :json
    ensure
      JiraClient.define_singleton_method(:new) { |*args, **kwargs, &block| original_new.call(*args, **kwargs, &block) }
    end

    assert_response :success
    assert_equal "PROJ-123", requested_issue_key

    body = JSON.parse(response.body)
    assert_equal "Jira task title", body["summary"]
    assert_equal "Jira task description", body["description"]
  end
end
