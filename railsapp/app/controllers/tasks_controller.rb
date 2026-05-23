class TasksController < ApplicationController
  include ActionView::RecordIdentifier

  before_action :set_task, only: [:edit, :update, :destroy, :favorite, :restore]

  def index
    @query = params[:q].to_s.strip
    tasks = current_user.tasks.left_outer_joins(:project)

    if @query.present?
      escaped_query = Task.sanitize_sql_like(@query)
      search_sql = [
        "tasks.title LIKE :query ESCAPE '\\'",
        "tasks.description LIKE :query ESCAPE '\\'",
        "tasks.jira_url LIKE :query ESCAPE '\\'",
        "projects.name LIKE :query ESCAPE '\\'"
      ].join(" OR ")

      tasks = tasks.where(search_sql, query: "%#{escaped_query}%")
    end

    @active_tasks   = tasks.active.ordered.includes(:project)
    @archived_tasks = tasks.archived.ordered.includes(:project)
    @new_task       = Task.new
  end

  def new
    @task     = Task.new
    @projects = current_user.projects.active.ordered
    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end

  def create
    @task = current_user.tasks.build(task_params)
    if @task.save
      respond_to do |format|
        format.json {
          render json: { id: @task.id, title: @task.title, jira_key: @task.jira_key, jira_url: @task.jira_url }
        }
        format.turbo_stream {
          render turbo_stream: [
            turbo_stream.prepend("active-tasks", partial: "tasks/task", locals: { task: @task }),
            turbo_stream.replace("task-form-frame", partial: "tasks/new_button")
          ]
        }
        format.html { redirect_to tasks_path }
      end
    else
      @projects = current_user.projects.active.ordered
      respond_to do |format|
        format.json { render json: { error: @task.errors.full_messages.first }, status: :unprocessable_entity }
        format.turbo_stream { render :new, status: :unprocessable_entity }
        format.html { render :new, status: :unprocessable_entity }
      end
    end
  end

  def edit
    @projects = current_user.projects.active.ordered
    respond_to do |format|
      format.turbo_stream
      format.html
    end
  end

  def update
    if @task.update(task_params)
      respond_to do |format|
        format.turbo_stream {
          render turbo_stream: turbo_stream.replace(
            dom_id(@task), partial: "tasks/task", locals: { task: @task }
          )
        }
        format.html { redirect_to tasks_path }
      end
    else
      @projects = current_user.projects.active.ordered
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    result = @task.destroy_or_archive!
    respond_to do |format|
      format.turbo_stream {
        if result == :archived
          render turbo_stream: turbo_stream.replace(
            dom_id(@task), partial: "tasks/task", locals: { task: @task.reload }
          )
        else
          render turbo_stream: turbo_stream.remove(dom_id(@task))
        end
      }
      format.html { redirect_to tasks_path }
    end
  end

  def favorite
    @task.update!(is_favorite: !@task.is_favorite)
    respond_to do |format|
      format.turbo_stream {
        render turbo_stream: turbo_stream.replace(
          dom_id(@task), partial: "tasks/task", locals: { task: @task }
        )
      }
      format.html { redirect_to tasks_path }
    end
  end

  def restore
    @task.update!(is_archived: false)
    respond_to do |format|
      format.turbo_stream {
        render turbo_stream: [
          turbo_stream.remove(dom_id(@task)),
          turbo_stream.prepend("active-tasks", partial: "tasks/task", locals: { task: @task })
        ]
      }
      format.html { redirect_to tasks_path }
    end
  end

  def fetch_jira_details
    jira_url  = params[:jira_url]
    issue_key = JiraClient.extract_issue_key(jira_url)
    return render json: { error: "Ogiltig Jira-URL" }, status: :bad_request unless issue_key

    u = current_user
    unless u.jira_url.present? && u.jira_email.present? && u.jira_api_token.present?
      return render json: { error: "Jira-konfiguration saknas. Gå till Profil." }, status: :bad_request
    end

    client  = JiraClient.new(jira_url: u.jira_url, jira_email: u.jira_email, jira_api_token: u.jira_api_token)
    details = client.fetch_issue(issue_key)
    render json: details
  rescue ArgumentError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  private

  def set_task
    @task = current_user.tasks.find(params[:id])
  end

  def task_params
    params.require(:task).permit(:title, :description, :jira_url, :project_id)
  end
end
