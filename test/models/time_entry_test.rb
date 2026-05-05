require "test_helper"

class TimeEntryTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      email: "time-entry-model@example.com",
      password_hash: User.hash_password("password123"),
      is_admin: false
    )
    @task = @user.tasks.create!(title: "Model task")
    @date = "2026-04-23"
  end

  test "requires duration start time or end time" do
    entry = build_entry

    assert_not entry.valid?
    assert_includes entry.errors[:base], "Ange varaktighet, starttid eller sluttid"
  end

  test "is valid with only duration" do
    entry = build_entry(duration_minutes: 30)

    assert entry.valid?
  end

  test "is valid with only start time" do
    entry = build_entry(start_time: Time.zone.local(2026, 4, 23, 9, 0))

    assert entry.valid?
  end

  test "is valid with only end time" do
    entry = build_entry(end_time: Time.zone.local(2026, 4, 23, 10, 0))

    assert entry.valid?
  end

  private

  def build_entry(attributes = {})
    @user.time_entries.build({
      task: @task,
      date: @date,
      description: "Worked on the task"
    }.merge(attributes))
  end
end
