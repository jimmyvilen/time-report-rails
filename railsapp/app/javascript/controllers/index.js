import { application } from "./application"

import MobileMenuController from "./mobile_menu_controller"
application.register("mobile-menu", MobileMenuController)

import TimeInputController from "./time_input_controller"
application.register("time-input", TimeInputController)

import SortableController from "./sortable_controller"
application.register("sortable", SortableController)

import MarkdownEditorController from "./markdown_editor_controller"
application.register("markdown-editor", MarkdownEditorController)

import TaskFormController from "./task_form_controller"
application.register("task-form", TaskFormController)

import TimeEntryFormController from "./time_entry_form_controller"
application.register("time-entry-form", TimeEntryFormController)

import TabsController from "./tabs_controller"
application.register("tabs", TabsController)

import NotePanelController from "./note_panel_controller"
application.register("note-panel", NotePanelController)

import TaskSelectorController from "./task_selector_controller"
application.register("task-selector", TaskSelectorController)

import DateNavigationController from "./date_navigation_controller"
application.register("date-navigation", DateNavigationController)
