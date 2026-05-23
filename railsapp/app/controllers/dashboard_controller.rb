class DashboardController < ApplicationController
  include WeeklySummaryBuildable
  def index
    @selected_date = safe_parse_date(params[:date]).iso8601
    @tasks         = current_user.tasks.active.ordered
    @time_entries  = current_user.time_entries
                       .where(date: @selected_date)
                       .includes(:task)
                       .order(position: :asc)
    @daily_note    = current_user.daily_notes.find_by(date: @selected_date)
    @new_entry     = TimeEntry.new(date: @selected_date)

    week_start    = Date.iso8601(@selected_date).beginning_of_week(:monday)
    week_end      = week_start + 6
    week_entries  = current_user.time_entries
                      .where(date: week_start.iso8601..week_end.iso8601)
                      .order(date: :asc)
    @weekly_days  = build_weekly_days(week_start, week_end, week_entries)
    @week_number  = Date.parse(@selected_date).cweek
    @week_total   = @weekly_days.sum { |d| d[:total_minutes] }
  end

  private

  def safe_parse_date(str)
    Date.iso8601(str.to_s)
  rescue ArgumentError, TypeError
    Date.today
  end

end
