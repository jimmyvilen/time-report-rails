class SetupController < ApplicationController
  layout "application"
  skip_before_action :authenticate!

  def new
    redirect_to login_path if User.exists?
  end

  def create
    return redirect_to login_path if User.exists?

    email    = params[:email].to_s.strip.downcase
    password = params[:password].to_s
    confirm  = params[:confirm_password].to_s

    if password != confirm
      flash.now[:alert] = "Lösenorden matchar inte"
      return render :new, status: :unprocessable_entity
    end

    if password.length < 8
      flash.now[:alert] = "Lösenordet måste vara minst 8 tecken"
      return render :new, status: :unprocessable_entity
    end

    user = User.new(
      email:         email,
      password_hash: User.hash_password(password),
      name:          email.split("@").first,
      is_admin:      true
    )

    if user.save
      session[:user_id] = user.id
      redirect_to dashboard_path
    else
      flash.now[:alert] = user.errors.full_messages.first
      render :new, status: :unprocessable_entity
    end
  end
end
