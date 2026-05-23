require "test_helper"

class NotesControllerTest < ActionDispatch::IntegrationTest
  test "index shows only current users notes with rendered markdown" do
    user = create_user(email: "notes-owner@example.com")
    other = create_user(email: "notes-other@example.com")
    user.daily_notes.create!(date: "2026-04-20", content: "# Heading\n\nFirst line\nSecond line\n\n- One")
    other.daily_notes.create!(date: "2026-04-21", content: "Private note")

    sign_in_as(user)

    get notes_path

    assert_response :success
    assert_select "time", text: "2026-04-20"
    assert_select "time", text: "2026-04-21", count: 0
    assert_select ".prose-content h1", text: "Heading"
    assert_select ".prose-content p br", count: 1
    assert_select ".prose-content li", text: "One"
  end

  test "index filters notes by query" do
    user = create_user(email: "notes-search@example.com")
    user.daily_notes.create!(date: "2026-04-20", content: "Client handoff")
    user.daily_notes.create!(date: "2026-04-21", content: "Internal planning")

    sign_in_as(user)

    get notes_path(q: "handoff")

    assert_response :success
    assert_select "time", text: "2026-04-20"
    assert_select "time", text: "2026-04-21", count: 0
    assert_select "p", text: "1 notering"
  end

  test "index escapes sql wildcards in query" do
    user = create_user(email: "notes-wildcards@example.com")
    user.daily_notes.create!(date: "2026-04-20", content: "Literal percent % marker")
    user.daily_notes.create!(date: "2026-04-21", content: "No matching marker")

    sign_in_as(user)

    get notes_path(q: "%")

    assert_response :success
    assert_select "time", text: "2026-04-20"
    assert_select "time", text: "2026-04-21", count: 0
  end

  test "index paginates notes ten per page" do
    user = create_user(email: "notes-pagination@example.com")
    12.times do |index|
      user.daily_notes.create!(
        date: (Date.new(2026, 4, 1) + index.days).iso8601,
        content: "Note #{index + 1}"
      )
    end

    sign_in_as(user)

    get notes_path

    assert_response :success
    assert_select "article", count: 10
    assert_select "time", text: "2026-04-12"
    assert_select "time", text: "2026-04-03"
    assert_select "time", text: "2026-04-02", count: 0
    assert_select "nav[aria-label='Sidnavigering']", text: /Sida 1 av 2/

    get notes_path(page: 2)

    assert_response :success
    assert_select "article", count: 2
    assert_select "time", text: "2026-04-02"
    assert_select "time", text: "2026-04-01"
    assert_select "time", text: "2026-04-03", count: 0
    assert_select "nav[aria-label='Sidnavigering']", text: /Sida 2 av 2/
  end

  test "index clamps invalid page params" do
    user = create_user(email: "notes-invalid-page@example.com")
    user.daily_notes.create!(date: "2026-04-20", content: "Only note")

    sign_in_as(user)

    get notes_path(page: "999")

    assert_response :success
    assert_select "article", count: 1
    assert_select "nav[aria-label='Sidnavigering']", count: 0

    get notes_path(page: "not-a-page")

    assert_response :success
    assert_select "article", count: 1
  end
end
