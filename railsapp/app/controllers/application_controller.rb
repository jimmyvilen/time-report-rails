class ApplicationController < ActionController::Base
  allow_browser versions: :modern
  layout "app"
  before_action :authenticate!

  helper_method :current_user, :logged_in?

  private

  def current_user
    return @current_user if defined?(@current_user)
    @current_user = session[:user_id] ? User.find_by(id: session[:user_id]) : nil
  end

  def logged_in?
    current_user.present?
  end

  def authenticate!
    unless logged_in?
      redirect_to login_path, alert: "Logga in för att fortsätta"
    end
  end
end
