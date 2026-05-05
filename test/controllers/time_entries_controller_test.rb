require "test_helper"

class TimeEntriesControllerTest < ActionDispatch::IntegrationTest
  test "create without time renders validation error and does not create an entry" do
    user = create_user(email: "time-entry-controller-invalid@example.com")
    task = user.tasks.create!(title: "Controller task")
    sign_in_as(user)

    assert_no_difference "TimeEntry.count" do
      post time_entries_path,
           params: {
             time_entry: {
               date: "2026-04-23",
               task_id: task.id,
               description: "Only text"
             }
           },
           headers: { "Accept" => "text/vnd.turbo-stream.html" }
    end

    assert_response :unprocessable_entity
    assert_includes response.body, "Ange varaktighet, starttid eller sluttid"
  end

  test "create with duration creates an entry" do
    user = create_user(email: "time-entry-controller-valid@example.com")
    task = user.tasks.create!(title: "Controller task")
    sign_in_as(user)

    assert_difference "TimeEntry.count", 1 do
      post time_entries_path,
           params: {
             time_entry: {
               date: "2026-04-23",
               task_id: task.id,
               duration: "45m",
               description: "Timed work"
             }
           },
           headers: { "Accept" => "text/vnd.turbo-stream.html" }
    end

    assert_response :success
    assert_equal 45, TimeEntry.order(:id).last.duration_minutes
  end

  test "changing task on pushed entry can delete previous jira worklog and clears push state" do
    user = create_jira_user("time-entry-controller-task-change@example.com")
    old_task = user.tasks.create!(title: "Old task", jira_url: "https://jira.example.com/browse/OLD-1")
    new_task = user.tasks.create!(title: "New task", jira_url: "https://jira.example.com/browse/NEW-2")
    entry = create_pushed_entry(user, old_task)
    deleted_worklogs = []
    client = jira_client_stub(deleted_worklogs)

    sign_in_as(user)

    with_jira_client(client) do
      patch time_entry_path(entry),
            params: {
              time_entry: {
                task_id: new_task.id,
                start_time: "09:00",
                end_time: "10:00",
                duration: "1h",
                description: "Moved work",
                delete_jira_worklog: "1"
              }
            },
            headers: { "Accept" => "text/vnd.turbo-stream.html" }
    end

    assert_response :success
    assert_equal [ [ "OLD-1", "wl-123" ] ], deleted_worklogs
    entry.reload
    assert_equal new_task, entry.task
    assert_nil entry.pushed_to_system
    assert_nil entry.pushed_at
    assert_nil entry.jira_worklog_id
  end

  test "changing duration on pushed entry can delete previous jira worklog and clears push state" do
    user = create_jira_user("time-entry-controller-duration-change@example.com")
    task = user.tasks.create!(title: "Jira task", jira_url: "https://jira.example.com/browse/TIME-1")
    entry = create_pushed_entry(user, task)
    deleted_worklogs = []
    client = jira_client_stub(deleted_worklogs)

    sign_in_as(user)

    with_jira_client(client) do
      patch time_entry_path(entry),
            params: {
              time_entry: {
                task_id: task.id,
                start_time: "09:00",
                end_time: "11:00",
                duration: "2h",
                description: "Longer work",
                delete_jira_worklog: "1"
              }
            },
            headers: { "Accept" => "text/vnd.turbo-stream.html" }
    end

    assert_response :success
    assert_equal [ [ "TIME-1", "wl-123" ] ], deleted_worklogs
    entry.reload
    assert_equal 120, entry.duration_minutes
    assert_nil entry.pushed_to_system
    assert_nil entry.pushed_at
    assert_nil entry.jira_worklog_id
  end

  test "changing pushed entry without deleting old jira worklog still clears local push state" do
    user = create_jira_user("time-entry-controller-keep-old@example.com")
    old_task = user.tasks.create!(title: "Old task", jira_url: "https://jira.example.com/browse/OLD-1")
    new_task = user.tasks.create!(title: "New task", jira_url: "https://jira.example.com/browse/NEW-2")
    entry = create_pushed_entry(user, old_task)
    deleted_worklogs = []
    client = jira_client_stub(deleted_worklogs)

    sign_in_as(user)

    with_jira_client(client) do
      patch time_entry_path(entry),
            params: {
              time_entry: {
                task_id: new_task.id,
                start_time: "09:00",
                end_time: "10:00",
                duration: "1h",
                description: "Keep old Jira worklog",
                delete_jira_worklog: "0"
              }
            },
            headers: { "Accept" => "text/vnd.turbo-stream.html" }
    end

    assert_response :success
    assert_empty deleted_worklogs
    entry.reload
    assert_equal new_task, entry.task
    assert_nil entry.pushed_to_system
    assert_nil entry.pushed_at
    assert_nil entry.jira_worklog_id
  end

  test "changing pushed entry with stored worklog requires explicit jira delete decision" do
    user = create_jira_user("time-entry-controller-missing-decision@example.com")
    old_task = user.tasks.create!(title: "Old task", jira_url: "https://jira.example.com/browse/OLD-1")
    new_task = user.tasks.create!(title: "New task", jira_url: "https://jira.example.com/browse/NEW-2")
    entry = create_pushed_entry(user, old_task)
    deleted_worklogs = []
    client = jira_client_stub(deleted_worklogs)

    sign_in_as(user)

    with_jira_client(client) do
      patch time_entry_path(entry),
            params: {
              time_entry: {
                task_id: new_task.id,
                start_time: "09:00",
                end_time: "10:00",
                duration: "1h",
                description: "Missing decision"
              }
            },
            headers: { "Accept" => "text/vnd.turbo-stream.html" }
    end

    assert_response :unprocessable_entity
    assert_includes response.body, "Välj om den gamla Jira-tidsregistreringen ska raderas."
    assert_empty deleted_worklogs
    entry.reload
    assert_equal old_task, entry.task
    assert_equal "JIRA_CLOUD", entry.pushed_to_system
    assert_equal "wl-123", entry.jira_worklog_id
  end

  test "jira delete failure blocks update and preserves old push state" do
    user = create_jira_user("time-entry-controller-delete-failure@example.com")
    old_task = user.tasks.create!(title: "Old task", jira_url: "https://jira.example.com/browse/OLD-1")
    new_task = user.tasks.create!(title: "New task", jira_url: "https://jira.example.com/browse/NEW-2")
    entry = create_pushed_entry(user, old_task)
    client = Object.new
    client.define_singleton_method(:delete_worklog) do |**_kwargs|
      raise ArgumentError, "Jira API-fel: 500"
    end

    sign_in_as(user)

    with_jira_client(client) do
      patch time_entry_path(entry),
            params: {
              time_entry: {
                task_id: new_task.id,
                start_time: "09:00",
                end_time: "10:00",
                duration: "1h",
                description: "Should not save",
                delete_jira_worklog: "1"
              }
            },
            headers: { "Accept" => "text/vnd.turbo-stream.html" }
    end

    assert_response :unprocessable_entity
    assert_includes response.body, "Jira API-fel: 500"
    entry.reload
    assert_equal old_task, entry.task
    assert_equal "JIRA_CLOUD", entry.pushed_to_system
    assert_not_nil entry.pushed_at
    assert_equal "wl-123", entry.jira_worklog_id
  end

  test "invalid time input raises instead of being treated as blank" do
    controller = TimeEntriesController.new

    error = assert_raises(ArgumentError) do
      controller.send(:parse_time_input, "25:00", "2026-04-23", "Starttid")
    end

    assert_equal "Starttid måste anges som HH:MM", error.message
  end

  private

  def create_jira_user(email)
    create_user(email: email).tap do |user|
      user.update!(
        jira_url: "https://jira.example.com",
        jira_email: email,
        jira_api_token: "token"
      )
    end
  end

  def create_pushed_entry(user, task)
    user.time_entries.create!(
      task: task,
      date: "2026-04-23",
      start_time: Time.zone.local(2026, 4, 23, 9, 0),
      end_time: Time.zone.local(2026, 4, 23, 10, 0),
      duration_minutes: 60,
      description: "Synced work",
      pushed_to_system: "JIRA_CLOUD",
      pushed_at: Time.zone.local(2026, 4, 23, 10, 5),
      jira_worklog_id: "wl-123"
    )
  end

  def jira_client_stub(deleted_worklogs)
    Object.new.tap do |client|
      client.define_singleton_method(:delete_worklog) do |issue_key:, worklog_id:|
        deleted_worklogs << [ issue_key, worklog_id ]
      end
    end
  end

  def with_jira_client(client)
    original_new = JiraClient.method(:new)
    JiraClient.define_singleton_method(:new) { |**_kwargs| client }
    yield
  ensure
    JiraClient.define_singleton_method(:new) { |*args, **kwargs, &block| original_new.call(*args, **kwargs, &block) }
  end
end
