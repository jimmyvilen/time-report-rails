class ProjectsController < ApplicationController
  include ActionView::RecordIdentifier

  before_action :set_project, only: [:show, :edit, :update, :destroy, :archive, :unarchive, :add_task, :remove_task]

  def index
    @active_projects   = current_user.projects.active.ordered
    @archived_projects = current_user.projects.archived.ordered
    @new_project       = Project.new
  end

  def show
    @tasks            = @project.tasks.active.ordered.includes(:time_entries)
    @unassigned_tasks = current_user.tasks.active.unassigned.ordered
    @total_minutes    = @project.total_minutes
  end

  def new
    @project = Project.new
    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end

  def create
    @project = current_user.projects.build(project_params)
    if @project.save
      respond_to do |format|
        format.turbo_stream {
          render turbo_stream: [
            turbo_stream.prepend("active-projects", partial: "projects/project", locals: { project: @project }),
            turbo_stream.replace("project-form-frame", partial: "projects/new_button")
          ]
        }
        format.html { redirect_to projects_path }
      end
    else
      respond_to do |format|
        format.turbo_stream { render :new, status: :unprocessable_entity }
        format.html         { render :new, status: :unprocessable_entity }
      end
    end
  end

  def edit
    respond_to do |format|
      format.turbo_stream
      format.html
    end
  end

  def update
    if @project.update(project_params)
      respond_to do |format|
        format.turbo_stream {
          render turbo_stream: turbo_stream.replace(
            dom_id(@project), partial: "projects/project", locals: { project: @project }
          )
        }
        format.html { redirect_to projects_path }
      end
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @project.destroy!
    respond_to do |format|
      format.turbo_stream { render turbo_stream: turbo_stream.remove(dom_id(@project)) }
      format.html         { redirect_to projects_path }
    end
  end

  def archive
    @project.update!(is_archived: true)
    respond_to do |format|
      format.turbo_stream {
        render turbo_stream: [
          turbo_stream.remove(dom_id(@project)),
          turbo_stream.prepend("archived-projects", partial: "projects/project", locals: { project: @project })
        ]
      }
      format.html { redirect_to projects_path }
    end
  end

  def unarchive
    @project.update!(is_archived: false)
    respond_to do |format|
      format.turbo_stream {
        render turbo_stream: [
          turbo_stream.remove(dom_id(@project)),
          turbo_stream.prepend("active-projects", partial: "projects/project", locals: { project: @project })
        ]
      }
      format.html { redirect_to projects_path }
    end
  end

  def add_task
    task = current_user.tasks.find(params[:task_id])
    task.update!(project: @project)
    respond_to do |format|
      format.turbo_stream {
        render turbo_stream: [
          turbo_stream.remove("unassigned-task-#{task.id}"),
          turbo_stream.append("project-tasks", partial: "projects/project_task", locals: { task: task, project: @project })
        ]
      }
      format.html { redirect_to project_path(@project) }
    end
  end

  def remove_task
    task = current_user.tasks.find(params[:task_id])
    task.update!(project: nil)
    respond_to do |format|
      format.turbo_stream {
        render turbo_stream: [
          turbo_stream.remove("project-task-#{task.id}"),
          turbo_stream.append("unassigned-tasks", partial: "projects/unassigned_task", locals: { task: task, project: @project })
        ]
      }
      format.html { redirect_to project_path(@project) }
    end
  end

  private

  def set_project
    @project = current_user.projects.find(params[:id])
  end

  def project_params
    params.require(:project).permit(:name, :description)
  end
end
