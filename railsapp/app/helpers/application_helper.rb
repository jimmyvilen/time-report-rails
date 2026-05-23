module ApplicationHelper
  def render_markdown(text)
    return "" if text.blank?
    renderer = Redcarpet::Render::HTML.new(filter_html: true, safe_links_only: true, hard_wrap: true)
    md = Redcarpet::Markdown.new(renderer,
      autolink: true,
      tables: true,
      fenced_code_blocks: true,
      strikethrough: true
    )
    md.render(text).html_safe
  end

  def format_duration(minutes)
    return "0m" if minutes.to_i <= 0
    h = minutes / 60
    m = minutes % 60
    if h > 0 && m > 0
      "#{h}h #{m}m"
    elsif h > 0
      "#{h}h"
    else
      "#{m}m"
    end
  end

  def swedish_day_label(date)
    I18n.l(Date.parse(date.to_s), format: :day_name)
  end
end
