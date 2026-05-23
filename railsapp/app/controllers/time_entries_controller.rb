class TimeEntriesController < ApplicationController
  include ActionView::RecordIdentifier
  include WeeklySummaryBuildable

  before_action :set_entry, only: [:edit, :update, :destroy, :push_to_jira, :duplicate]

  def new
    @date  = params[:date] || Date.today.iso8601
    @entry = TimeEntry.new(date: @date)
    @tasks = current_user.tasks.active.ordered
  end

  def create
    @date  = params.dig(:time_entry, :date) || Date.today.iso8601
    @tasks = current_user.tasks.active.ordered
    @entry = current_user.time_entries.build(date: @date)
    @entry.task_id     = params.dig(:time_entry, :task_id)
    @entry.description = params.dig(:time_entry, :description)

    begin
      resolved = resolve_time_entry_attributes(@date)
      @entry.assign_attributes(resolved)
    rescue ArgumentError => e
      @entry.errors.add(:base, e.message)
      return render_new_entry_error
    end

    TimeEntry.transaction do
      current_user.time_entries.where(date: @date).update_all("position = position + 1")
      @entry.position = 0
      raise ActiveRecord::Rollback unless @entry.save
    end

    if @entry.persisted?
      @entry.task.touch(:last_used_at)
      respond_to do |format|
        format.turbo_stream {
          render turbo_stream: [
            turbo_stream.prepend("time-entries-#{@date}",
              partial: "time_entries/time_entry", locals: { entry: @entry }),
            turbo_stream.replace("time-entries-total",
              partial: "time_entries/total",
              locals: { entries: current_user.time_entries.where(date: @date).includes(:task).order(position: :asc) }),
            turbo_stream.replace("new-entry-form",
              partial: "time_entries/new_form",
              locals: { entry: TimeEntry.new(date: @date), date: @date, tasks: @tasks }),
            week_summary_stream(@date)
          ]
        }
        format.html { redirect_to dashboard_path(date: @date) }
      end
    else
      render_new_entry_error
    end
  end

  def edit
    @date  = @entry.date
    @tasks = current_user.tasks.active.ordered
    @jira_sync_snapshot = jira_sync_snapshot(@entry)
  end

  def update
    @date  = @entry.date.to_s
    @tasks = current_user.tasks.active.ordered
    original_jira_sync = jira_sync_snapshot(@entry)
    @jira_sync_snapshot = original_jira_sync

    begin
      resolved = resolve_time_entry_attributes(@date)
      attrs = resolved.merge(
        task_id:     params.dig(:time_entry, :task_id) || @entry.task_id,
        description: params.dig(:time_entry, :description)
      )
      @entry.assign_attributes(attrs)
    rescue ArgumentError => e
      @entry.errors.add(:base, e.message)
      return render_edit_error
    end

    if jira_reset_required?(original_jira_sync, @entry)
      return render_edit_error unless @entry.valid?

      if jira_delete_decision_required?(original_jira_sync) && jira_delete_decision_missing?
        @entry.errors.add(:base, "Välj om den gamla Jira-tidsregistreringen ska raderas.")
        return render_edit_error
      end

      if delete_jira_worklog_requested?
        begin
          delete_previous_jira_worklog!(original_jira_sync)
        rescue ArgumentError => e
          @entry.errors.add(:base, e.message)
          return render_edit_error
        end
      end

      clear_jira_push_state(@entry)
    end

    if @entry.save
      respond_to do |format|
        format.turbo_stream {
          render turbo_stream: [
            turbo_stream.replace(dom_id(@entry),
              partial: "time_entries/time_entry", locals: { entry: @entry.reload }),
            turbo_stream.replace("time-entries-total",
              partial: "time_entries/total",
              locals: { entries: current_user.time_entries.where(date: @date).includes(:task).order(position: :asc) }),
            week_summary_stream(@date)
          ]
        }
        format.html { redirect_to dashboard_path(date: @date) }
      end
    else
      render_edit_error
    end
  end

  def destroy
    date = @entry.date
    @entry.destroy!
    respond_to do |format|
      format.turbo_stream {
        render turbo_stream: [
          turbo_stream.remove(dom_id(@entry)),
          turbo_stream.replace("time-entries-total",
            partial: "time_entries/total",
            locals: { entries: current_user.time_entries.where(date: date).includes(:task).order(position: :asc) }),
          week_summary_stream(date.to_s)
        ]
      }
      format.html { redirect_to dashboard_path(date: date) }
    end
  end

  def reorder
    entries_data = params[:entries]
    return head :bad_request unless entries_data.is_a?(Array)

    TimeEntry.transaction do
      entries_data.each do |ep|
        current_user.time_entries.where(id: ep[:id].to_i).update_all(position: ep[:position].to_i)
      end
    end
    head :ok
  end

  def weekly_summary
    date       = safe_parse_date(params[:date])
    week_start = date.beginning_of_week(:monday)
    week_end   = week_start + 6
    entries    = current_user.time_entries
                   .where(date: week_start.iso8601..week_end.iso8601)
                   .order(date: :asc)

    days = (week_start..week_end).map do |d|
      day_entries = entries.select { |e| e.date == d.to_s }
      {
        date:          d.iso8601,
        day_name:      I18n.l(d, format: :day_name),
        first_start:   day_entries.filter_map(&:start_time).min&.strftime("%H:%M"),
        last_end:      day_entries.filter_map(&:end_time).max&.strftime("%H:%M"),
        total_minutes: day_entries.sum { |e| e.effective_duration_minutes.to_i }
      }
    end

    render json: {
      week_number:   date.cweek,
      total_minutes: days.sum { |d| d[:total_minutes] },
      days:          days
    }
  end

  def recent_description
    task_id = params[:task_id].to_i
    entry   = current_user.time_entries
                .where(task_id: task_id)
                .where.not(description: [nil, ""])
                .order(date: :desc, created_at: :desc)
                .pick(:description)
    render json: { description: entry }
  end

  def duplicate
    @date  = @entry.date.to_s
    @tasks = current_user.tasks.active.ordered
    original_position = @entry.position

    @new_entry = current_user.time_entries.build(
      task_id:          @entry.task_id,
      date:             @date,
      start_time:       @entry.start_time,
      end_time:         @entry.end_time,
      duration_minutes: @entry.duration_minutes,
      description:      @entry.description
    )

    TimeEntry.transaction do
      current_user.time_entries.where(date: @date).where("position > ?", original_position)
                  .update_all("position = position + 1")
      @new_entry.position = original_position + 1
      raise ActiveRecord::Rollback unless @new_entry.save
    end

    if @new_entry.persisted?
      respond_to do |format|
        format.turbo_stream {
          render turbo_stream: [
            turbo_stream.after(dom_id(@entry),
              partial: "time_entries/time_entry", locals: { entry: @new_entry }),
            turbo_stream.replace("time-entries-total",
              partial: "time_entries/total",
              locals: { entries: current_user.time_entries.where(date: @date).includes(:task).order(position: :asc) }),
            week_summary_stream(@date)
          ]
        }
        format.html { redirect_to dashboard_path(date: @date) }
      end
    else
      head :unprocessable_entity
    end
  end

  def export
    from = safe_parse_date(params[:from])
    to   = safe_parse_date(params[:to])

    if params[:from].present? && params[:to].present?
      require "csv"
      entries = current_user.time_entries
                  .where(date: from.iso8601..to.iso8601)
                  .includes(task: :project)
                  .order(:date, :position)

      csv_data = CSV.generate(headers: true) do |csv|
        csv << [ "Datum", "Projekt", "Uppgift", "Beskrivning", "Start", "Slut", "Minuter" ]
        entries.each do |e|
          csv << [
            e.date,
            e.task.project&.name,
            e.task.title,
            e.description,
            e.start_time&.strftime("%H:%M"),
            e.end_time&.strftime("%H:%M"),
            e.effective_duration_minutes
          ]
        end
      end

      send_data csv_data,
                filename: "tidsrapport-#{from}-#{to}.csv",
                type: "text/csv; charset=utf-8"
    else
      @from = (Date.today - 1.week).beginning_of_week(:monday).iso8601
      @to   = (Date.today - 1.week).end_of_week(:monday).iso8601
    end
  end

  def push_to_jira
    unless @entry.can_push_to_jira?
      return render json: { error: "Tidsrapporten måste ha start- och sluttid samt varaktighet" },
                    status: :unprocessable_entity
    end

    task = @entry.task
    return render json: { error: "Task saknar Jira-URL" }, status: :bad_request unless task.jira_url.present?

    issue_key = JiraClient.extract_issue_key(task.jira_url)
    return render json: { error: "Kunde inte extrahera issue key från Jira-URL" }, status: :bad_request unless issue_key

    u = current_user
    unless u.jira_url.present? && u.jira_email.present? && u.jira_api_token.present?
      return render json: { error: "Jira-konfiguration saknas. Gå till Profil." }, status: :bad_request
    end

    client  = JiraClient.new(jira_url: u.jira_url, jira_email: u.jira_email, jira_api_token: u.jira_api_token)
    started = JiraClient.format_worklog_date(@entry.start_time)
    worklog = client.create_worklog(
      issue_key:          issue_key,
      time_spent_seconds: @entry.effective_duration_minutes * 60,
      started:            started,
      comment:            @entry.description
    )

    @entry.update!(
      pushed_to_system: "JIRA_CLOUD",
      pushed_at:        Time.current,
      jira_worklog_id:  worklog["id"]
    )

    respond_to do |format|
      format.turbo_stream {
        render turbo_stream: turbo_stream.replace(
          dom_id(@entry), partial: "time_entries/time_entry", locals: { entry: @entry.reload }
        )
      }
      format.json { render json: { success: true } }
    end
  rescue ArgumentError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  private

  def week_summary_stream(date_str)
    date        = Date.iso8601(date_str)
    week_start  = date.beginning_of_week(:monday)
    week_end    = week_start + 6
    entries     = current_user.time_entries.where(date: week_start.iso8601..week_end.iso8601).order(date: :asc)
    weekly_days = build_weekly_days(week_start, week_end, entries)
    turbo_stream.replace("week-summary",
      partial: "dashboard/week_summary",
      locals: {
        weekly_days:   weekly_days,
        week_number:   date.cweek,
        week_total:    weekly_days.sum { |d| d[:total_minutes] },
        selected_date: date_str
      })
  end

  def set_entry
    @entry = current_user.time_entries.find(params[:id])
  end

  def parse_time_input(value, date_str, field_name)
    return nil if value.blank?

    unless value.match?(/\A([01]\d|2[0-3]):[0-5]\d\z/)
      raise ArgumentError, "#{field_name} måste anges som HH:MM"
    end

    date = Date.iso8601(date_str)
    hour, minute = value.split(":").map(&:to_i)
    Time.zone.local(date.year, date.month, date.day, hour, minute)
  end

  def resolve_time_entry_attributes(date_str)
    raw_start_time = params.dig(:time_entry, :start_time)
    raw_end_time = params.dig(:time_entry, :end_time)
    raw_duration = params.dig(:time_entry, :duration)

    if raw_start_time.blank? && raw_end_time.blank? && raw_duration.blank?
      return { start_time: nil, end_time: nil, duration_minutes: nil }
    end

    TimeEntryResolver.resolve(
      date_str: date_str,
      start_time: parse_time_input(raw_start_time, date_str, "Starttid"),
      end_time: parse_time_input(raw_end_time, date_str, "Sluttid"),
      duration_minutes: DurationParser.parse(raw_duration)
    )
  end

  def jira_sync_snapshot(entry)
    {
      pushed:                     entry.pushed?,
      task_id:                    entry.task_id,
      task_jira_url:              entry.task&.jira_url,
      start_time_value:           entry.start_time&.strftime("%H:%M"),
      start_time_seconds:         entry.start_time&.to_i,
      effective_duration_minutes: entry.effective_duration_minutes.to_i,
      jira_worklog_id:            entry.jira_worklog_id
    }
  end

  def jira_reset_required?(snapshot, entry)
    return false unless snapshot[:pushed] || snapshot[:jira_worklog_id].present?

    snapshot[:task_id] != entry.task_id ||
      snapshot[:start_time_seconds] != entry.start_time&.to_i ||
      snapshot[:effective_duration_minutes] != entry.effective_duration_minutes.to_i
  end

  def delete_jira_worklog_requested?
    ActiveModel::Type::Boolean.new.cast(params.dig(:time_entry, :delete_jira_worklog))
  end

  def jira_delete_decision_required?(snapshot)
    snapshot[:jira_worklog_id].present?
  end

  def jira_delete_decision_missing?
    params.dig(:time_entry, :delete_jira_worklog).blank?
  end

  def delete_previous_jira_worklog!(snapshot)
    return if snapshot[:jira_worklog_id].blank?

    issue_key = JiraClient.extract_issue_key(snapshot[:task_jira_url])
    raise ArgumentError, "Kunde inte extrahera issue key från tidigare Jira-URL" unless issue_key

    u = current_user
    unless u.jira_url.present? && u.jira_email.present? && u.jira_api_token.present?
      raise ArgumentError, "Jira-konfiguration saknas. Gå till Profil."
    end

    client = JiraClient.new(jira_url: u.jira_url, jira_email: u.jira_email, jira_api_token: u.jira_api_token)
    client.delete_worklog(issue_key: issue_key, worklog_id: snapshot[:jira_worklog_id])
  end

  def clear_jira_push_state(entry)
    entry.pushed_to_system = nil
    entry.pushed_at = nil
    entry.jira_worklog_id = nil
  end

  def render_new_entry_error
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace(
          "new-entry-form",
          partial: "time_entries/new_form",
          locals: { entry: @entry, date: @date, tasks: @tasks }
        ), status: :unprocessable_entity
      end
      format.html { render :new, status: :unprocessable_entity }
    end
  end

  def render_edit_error
    render :edit, formats: [:html], status: :unprocessable_entity
  end

  def safe_parse_date(str)
    Date.iso8601(str.to_s)
  rescue ArgumentError, TypeError
    Date.today
  end
end
