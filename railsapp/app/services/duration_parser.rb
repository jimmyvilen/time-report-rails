class DurationParser
  PAIR_RE = /(\d+(?:\.\d+)?)\s*(h|m)\b/i

  def self.parse(raw)
    return nil if raw.blank?
    trimmed = raw.strip.downcase
    return nil if trimmed.start_with?("-")

    total = 0
    matched = false
    idx = 0

    while idx < trimmed.length
      if trimmed[idx].match?(/\s/)
        idx += 1
        next
      end

      match = PAIR_RE.match(trimmed, idx)
      return nil unless match && match.begin(0) == idx

      n = match[1].to_f
      return nil unless n.finite? && n >= 0
      total += match[2].downcase == "h" ? (n * 60).round : n.round
      matched = true
      idx = match.end(0)
    end

    return nil unless matched
    return nil unless total > 0

    total
  end

  def self.format_minutes(minutes)
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
end
