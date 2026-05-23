class DailyNotesController < ApplicationController
  def show
    @note = current_user.daily_notes.find_by!(date: params[:date])
    render json: { id: @note.id, date: @note.date, content: @note.content }
  rescue ActiveRecord::RecordNotFound
    render json: { content: nil }
  end

  def create
    upsert_note
  end

  def update
    upsert_note
  end

  private

  def upsert_note
    date    = params.dig(:daily_note, :date) || params[:date]
    content = params.dig(:daily_note, :content).to_s.strip

    @note = current_user.daily_notes.find_or_initialize_by(date: date)
    @note.content = content

    if @note.save
      respond_to do |format|
        format.turbo_stream {
          render turbo_stream: [
            turbo_stream.update("daily-note-toggle-text",
              partial: "daily_notes/note_toggle_text",
              locals: { note: @note }),
            turbo_stream.replace("daily-note-panel",
              partial: "daily_notes/note_panel",
              locals: { note: @note, date: date })
          ]
        }
        format.json { render json: { id: @note.id, date: @note.date } }
        format.html { redirect_to dashboard_path(date: date) }
      end
    else
      render json: { errors: @note.errors.full_messages }, status: :unprocessable_entity
    end
  end
end
