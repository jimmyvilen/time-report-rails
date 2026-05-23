class User < ApplicationRecord
  self.table_name = "users"

  has_many :projects, dependent: :destroy
  has_many :tasks, dependent: :destroy
  has_many :time_entries, dependent: :destroy
  has_many :daily_notes, dependent: :destroy

  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }

  def authenticate(password)
    return false if password_hash.blank?
    BCrypt::Password.new(password_hash) == password.strip
  rescue BCrypt::Errors::InvalidHash
    false
  end

  def self.hash_password(password)
    BCrypt::Password.create(password.strip, cost: 12).to_s
  end
end
