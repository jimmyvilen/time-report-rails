class NotesController < ApplicationController
  NOTES_PER_PAGE = 10

  def index
    @query = params[:q].to_s.strip
    scope  = current_user.daily_notes.order(date: :desc)
    if @query.present?
      escaped_query = DailyNote.sanitize_sql_like(@query)
      scope = scope.where("content LIKE ? ESCAPE '\\'", "%#{escaped_query}%")
    end

    @total_count = scope.count
    @total_pages = [ (@total_count.to_f / NOTES_PER_PAGE).ceil, 1 ].max
    @page = params[:page].to_i
    @page = 1 if @page < 1
    @page = @total_pages if @page > @total_pages
    @per_page = NOTES_PER_PAGE
    @notes = scope.limit(@per_page).offset((@page - 1) * @per_page)
  end

  def export
    from = safe_parse_date(params[:from])
    to   = safe_parse_date(params[:to])

    if params[:from].present? && params[:to].present?
      require "csv"
      notes = current_user.daily_notes
                .where(date: from.iso8601..to.iso8601)
                .order(:date)

      csv_data = CSV.generate(headers: true) do |csv|
        csv << [ "Datum", "Notering" ]
        notes.each { |n| csv << [ n.date, n.content ] }
      end

      send_data csv_data,
                filename: "noteringar-#{from}-#{to}.csv",
                type: "text/csv; charset=utf-8"
    else
      @from = (Date.today - 1.week).beginning_of_week(:monday).iso8601
      @to   = (Date.today - 1.week).end_of_week(:monday).iso8601
      render "time_entries/export"
    end
  end

  private

  def safe_parse_date(str)
    Date.iso8601(str.to_s)
  rescue ArgumentError, TypeError
    Date.today
  end
end
