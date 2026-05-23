module WeeklySummaryBuildable
  def build_weekly_days(week_start, week_end, entries)
    (week_start..week_end).map do |d|
      day_entries = entries.select { |e| e.date == d.to_s }
      {
        date:          d.iso8601,
        day_name:      I18n.l(d, format: :day_name),
        first_start:   day_entries.filter_map(&:start_time).min&.strftime("%H:%M"),
        last_end:      day_entries.filter_map(&:end_time).max&.strftime("%H:%M"),
        total_minutes: day_entries.sum { |e| e.effective_duration_minutes.to_i }
      }
    end
  end
end
