class Project < ApplicationRecord
  belongs_to :user
  has_many :tasks, dependent: :nullify

  attribute :is_archived, :boolean, default: false

  scope :active,   -> { where(is_archived: false) }
  scope :archived, -> { where(is_archived: true) }
  scope :ordered,  -> { order(name: :asc) }

  validates :name, presence: true
  validates :name, uniqueness: { scope: :user_id, case_sensitive: false }

  def total_minutes
    tasks.joins(:time_entries).sum("time_entries.duration_minutes").to_i
  end
end
