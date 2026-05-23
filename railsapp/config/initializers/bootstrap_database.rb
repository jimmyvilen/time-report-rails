ActiveSupport.on_load(:active_record) do
  conn = ActiveRecord::Base.connection

  unless conn.table_exists?(:users)
    conn.execute(<<~SQL)
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        password_hash TEXT,
        name TEXT,
        avatar_url TEXT,
        jira_url TEXT,
        jira_email TEXT,
        jira_api_token TEXT,
        jira_integration_system TEXT NOT NULL DEFAULT 'JIRA_CLOUD',
        is_admin BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    SQL
    conn.execute("CREATE UNIQUE INDEX users_email_key ON users(email)")
  end

  unless conn.table_exists?(:tasks)
    conn.execute(<<~SQL)
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        jira_url TEXT,
        user_id INTEGER NOT NULL,
        is_favorite BOOLEAN NOT NULL DEFAULT 0,
        is_archived BOOLEAN NOT NULL DEFAULT 0,
        last_used_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    SQL
    conn.execute("CREATE INDEX tasks_user_id_idx ON tasks(user_id)")
  end

  unless conn.table_exists?(:time_entries)
    conn.execute(<<~SQL)
      CREATE TABLE time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        task_id INTEGER NOT NULL,
        start_time DATETIME,
        end_time DATETIME,
        duration_minutes INTEGER,
        description TEXT,
        date DATE NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        pushed_to_system TEXT,
        pushed_at DATETIME,
        jira_worklog_id TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    SQL
    conn.execute("CREATE INDEX time_entries_user_id_idx ON time_entries(user_id)")
    conn.execute("CREATE INDEX time_entries_task_id_idx ON time_entries(task_id)")
    conn.execute("CREATE INDEX time_entries_user_id_date_position_idx ON time_entries(user_id, date, position)")
  end

  unless conn.table_exists?(:daily_notes)
    conn.execute(<<~SQL)
      CREATE TABLE daily_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    SQL
    conn.execute("CREATE UNIQUE INDEX daily_notes_user_id_date_unique_idx ON daily_notes(user_id, date)")
  end
rescue => e
  Rails.logger.error "Database bootstrap failed: #{e.message}"
  raise
end
