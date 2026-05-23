class SessionsController < ApplicationController
  layout "application"
  skip_before_action :authenticate!, only: [:new, :create]

  def new
    return redirect_to dashboard_path if logged_in?
    return redirect_to setup_path if User.none?
  end

  def create
    email    = params[:email].to_s.strip.downcase
    password = params[:password].to_s

    user = User.find_by(email: email)
    if user&.authenticate(password)
      session[:user_id] = user.id
      redirect_to dashboard_path
    else
      flash.now[:alert] = "Felaktig e-post eller lösenord"
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    session.delete(:user_id)
    redirect_to login_path
  end
end
