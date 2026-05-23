class ProfilesController < ApplicationController
  def edit
    @user = current_user
  end

  def update
    @user = current_user
    attrs = profile_params.to_h

    if attrs[:password].present?
      if attrs[:password] != attrs[:password_confirmation]
        flash.now[:alert] = "Lösenorden matchar inte"
        return render :edit, status: :unprocessable_entity
      end
      if attrs[:password].length < 8
        flash.now[:alert] = "Lösenordet måste vara minst 8 tecken"
        return render :edit, status: :unprocessable_entity
      end
      attrs[:password_hash] = User.hash_password(attrs[:password])
    end

    attrs.delete(:password)
    attrs.delete(:password_confirmation)

    if @user.update(attrs)
      redirect_to edit_profile_path, notice: "Profilen har uppdaterats!"
    else
      flash.now[:alert] = @user.errors.full_messages.first
      render :edit, status: :unprocessable_entity
    end
  end

  private

  def profile_params
    params.require(:user).permit(
      :name, :avatar_url, :password, :password_confirmation,
      :jira_url, :jira_email, :jira_api_token, :jira_integration_system
    )
  end
end
