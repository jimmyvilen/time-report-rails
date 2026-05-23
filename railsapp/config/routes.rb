Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # Public routes
  get    "/setup",    to: "setup#new",          as: :setup
  post   "/setup",    to: "setup#create"

  get    "/login",    to: "sessions#new",        as: :login
  post   "/login",    to: "sessions#create"
  delete "/logout",   to: "sessions#destroy",    as: :logout

  get    "/register", to: "registrations#new",   as: :register
  post   "/register", to: "registrations#create"

  # Authenticated app
  scope "/app" do
    get "/",        to: "dashboard#index",       as: :dashboard

    resources :projects do
      member do
        patch :archive
        patch :unarchive
        patch :add_task
        patch :remove_task
      end
    end

    resources :tasks do
      member do
        patch :favorite
        post  :restore
      end
    end

    resources :time_entries do
      collection do
        post :reorder
        get  :weekly_summary
        get  :recent_description
        get  :export
      end
      member do
        post :push_to_jira
        post :duplicate
      end
    end

    resources :daily_notes, param: :date, only: [:show, :create, :update]
    get    "/notes/export", to: "notes#export",   as: :export_notes
    get    "/notes", to: "notes#index",          as: :notes
    resource :profile, only: [:edit, :update]
    get    "/jira/fetch_details", to: "tasks#fetch_jira_details", as: :jira_fetch_details
  end

  root to: redirect("/login")
end
