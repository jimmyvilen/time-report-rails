class TimeEntryResolver
  def self.resolve(date_str:, start_time:, end_time:, duration_minutes:)
    s  = start_time
    e  = end_time
    dm = duration_minutes

    if s && e
      diff = ((e - s) / 60).round
      raise ArgumentError, "Sluttid måste vara efter starttid" if diff <= 0
      validate_on_date!(date_str, s, e)
      return { start_time: s, end_time: e, duration_minutes: diff }
    end

    if s && dm&.positive?
      e2 = s + dm * 60
      validate_on_date!(date_str, s, e2)
      return { start_time: s, end_time: e2, duration_minutes: dm }
    end

    if e && dm&.positive?
      s2 = e - dm * 60
      validate_on_date!(date_str, s2, e)
      return { start_time: s2, end_time: e, duration_minutes: dm }
    end

    if !s && !e && dm&.positive?
      return { start_time: nil, end_time: nil, duration_minutes: dm }
    end

    raise ArgumentError, "Ange varaktighet eller start- och sluttid" if !s && !e

    return { start_time: s, end_time: nil, duration_minutes: nil } if s && !e

    { start_time: nil, end_time: e, duration_minutes: nil }
  end

  def self.validate_on_date!(date_str, *times)
    times.compact.each do |t|
      if t.strftime("%Y-%m-%d") != date_str
        raise ArgumentError, "Varaktigheten får inte passera midnatt för detta datum"
      end
    end
  end
end
