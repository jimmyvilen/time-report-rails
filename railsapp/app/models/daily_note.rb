class DailyNote < ApplicationRecord
  self.table_name = "daily_notes"

  belongs_to :user

  validates :date, presence: true, format: { with: /\A\d{4}-\d{2}-\d{2}\z/ }
  validates :content, presence: true
  validates :date, uniqueness: { scope: :user_id }
end
