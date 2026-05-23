class TimeEntry < ApplicationRecord
  self.table_name = "time_entries"

  belongs_to :user
  belongs_to :task

  validates :date, presence: true, format: { with: /\A\d{4}-\d{2}-\d{2}\z/ }
  validates :task_id, presence: true
  validates :duration_minutes, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validate :time_information_present
  validate :end_time_after_start_time
  validate :task_belongs_to_user

  def effective_duration_minutes
    if start_time && end_time
      diff = ((end_time - start_time) / 60).round
      diff > 0 ? diff : duration_minutes
    else
      duration_minutes
    end
  end

  def can_push_to_jira?
    return false unless task&.jira_url.present?
    return false unless effective_duration_minutes.to_i > 0
    start_time.present? && end_time.present?
  end

  def pushed?
    pushed_to_system.present?
  end

  private

  def time_information_present
    return if duration_minutes.to_i.positive? || start_time.present? || end_time.present?

    errors.add(:base, "Ange varaktighet, starttid eller sluttid")
  end

  def end_time_after_start_time
    return unless start_time && end_time
    errors.add(:end_time, "must be after start time") if end_time <= start_time
  end

  def task_belongs_to_user
    return unless task && user_id
    errors.add(:task, "must belong to this user") if task.user_id != user_id
  end
end
