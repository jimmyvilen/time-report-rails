# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_04_23_122032) do
  create_table "daily_notes", force: :cascade do |t|
    t.text "content", null: false
    t.datetime "created_at", precision: nil, default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.text "date", null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "user_id", null: false
    t.index ["user_id", "date"], name: "daily_notes_user_id_date_key", unique: true
    t.index ["user_id", "date"], name: "daily_notes_user_id_date_unique_idx", unique: true
  end

  create_table "projects", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "description"
    t.boolean "is_archived", default: false, null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["user_id", "name"], name: "index_projects_on_user_id_and_name", unique: true
    t.index ["user_id"], name: "index_projects_on_user_id"
  end

  create_table "tasks", force: :cascade do |t|
    t.datetime "created_at", precision: nil, default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.datetime "deleted_at", precision: nil
    t.text "description"
    t.boolean "is_archived", null: false
    t.boolean "is_favorite", null: false
    t.text "jira_url"
    t.datetime "last_used_at", precision: nil
    t.integer "project_id"
    t.text "title", null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "user_id", null: false
    t.index ["project_id"], name: "index_tasks_on_project_id"
    t.index ["user_id"], name: "tasks_user_id_idx"
  end

  create_table "time_entries", force: :cascade do |t|
    t.datetime "created_at", precision: nil, default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.text "date", null: false
    t.text "description"
    t.integer "duration_minutes"
    t.datetime "end_time", precision: nil
    t.text "jira_worklog_id"
    t.integer "position", default: 0, null: false
    t.datetime "pushed_at", precision: nil
    t.text "pushed_to_system"
    t.datetime "start_time", precision: nil
    t.integer "task_id", null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "user_id", null: false
    t.index ["task_id"], name: "time_entries_task_id_idx"
    t.index ["user_id", "date", "position"], name: "time_entries_user_id_date_position_idx"
    t.index ["user_id"], name: "time_entries_user_id_idx"
  end

  create_table "users", force: :cascade do |t|
    t.text "avatar_url"
    t.datetime "created_at", precision: nil, default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.text "email", null: false
    t.boolean "is_admin", null: false
    t.text "jira_api_token"
    t.text "jira_email"
    t.text "jira_integration_system", default: "JIRA_CLOUD", null: false
    t.text "jira_url"
    t.text "name"
    t.text "password_hash"
    t.datetime "updated_at", precision: nil, null: false
    t.index ["email"], name: "users_email_key", unique: true
  end

  add_foreign_key "daily_notes", "users", on_update: :cascade, on_delete: :cascade
  add_foreign_key "projects", "users"
  add_foreign_key "tasks", "projects"
  add_foreign_key "tasks", "users", on_update: :cascade, on_delete: :cascade
  add_foreign_key "time_entries", "tasks", on_update: :cascade, on_delete: :cascade
  add_foreign_key "time_entries", "users", on_update: :cascade, on_delete: :cascade
end
