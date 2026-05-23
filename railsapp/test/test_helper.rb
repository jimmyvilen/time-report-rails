ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  parallelize(workers: 1)
end

class ActionDispatch::IntegrationTest
  private

  def create_user(email:, password: "password123")
    User.create!(
      email: email,
      password_hash: User.hash_password(password),
      is_admin: false
    )
  end

  def sign_in_as(user, password: "password123")
    post login_path, params: { email: user.email, password: password }
    assert_redirected_to dashboard_path
    follow_redirect!
  end
end
