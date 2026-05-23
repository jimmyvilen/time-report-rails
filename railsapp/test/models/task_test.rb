require "test_helper"

class TaskTest < ActiveSupport::TestCase
  test "project must belong to the same user" do
    owner = User.create!(email: "owner@example.com", password_hash: User.hash_password("password123"), is_admin: false)
    other = User.create!(email: "other@example.com", password_hash: User.hash_password("password123"), is_admin: false)
    foreign_project = owner.projects.create!(name: "Foreign Project")

    task = other.tasks.build(title: "Cross-account task", project: foreign_project)

    assert_not task.valid?
    assert_includes task.errors[:project], "must belong to this user"
  end
end
