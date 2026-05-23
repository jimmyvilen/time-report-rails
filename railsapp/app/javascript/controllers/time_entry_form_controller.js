import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "taskSelect",
    "description",
    "duration",
    "startTime",
    "endTime",
    "formPanel",
    "deleteJiraWorklog",
    "jiraResetModal"
  ]
  static values = {
    recentDescriptionUrl: String,
    originalPushed: Boolean,
    originalJiraWorklogId: String,
    originalTaskId: String,
    originalStartTime: String,
    originalEffectiveDurationMinutes: Number
  }

  toggle() {
    this.formPanelTarget.classList.toggle("hidden")
  }

  onTaskChange() {
    const taskId = this.taskSelectTarget.value
    if (!taskId || !this.hasDescriptionTarget) return
    if (this.descriptionTarget.value.trim()) return  // don't overwrite existing text

    const url = new URL(this.recentDescriptionUrlValue)
    url.searchParams.set("task_id", taskId)

    fetch(url.toString(), { headers: { Accept: "application/json" } })
      .then(r => r.json())
      .then(data => {
        if (data.description && !this.descriptionTarget.value.trim()) {
          this.descriptionTarget.value = data.description
        }
      })
      .catch(() => {})
  }

  onStartTimeChange() {
    const startMins = this.#parseTimeToMinutes(this.startTimeTarget.value)
    if (startMins === null) return

    if (this.hasEndTimeTarget && this.endTimeTarget.value.trim()) {
      const endMins = this.#parseTimeToMinutes(this.endTimeTarget.value)
      if (endMins === null || endMins <= startMins) return
      this.durationTarget.value = this.#formatMinutesToDuration(endMins - startMins)
    } else {
      const durationMins = this.#parseDurationToMinutes(this.durationTarget.value)
      if (durationMins === null) return
      if (this.hasEndTimeTarget) {
        this.endTimeTarget.value = this.#formatMinutesToTime(startMins + durationMins)
      }
    }
  }

  onEndTimeChange() {
    const endMins = this.#parseTimeToMinutes(this.endTimeTarget.value)
    if (endMins === null) return

    if (this.hasStartTimeTarget && this.startTimeTarget.value.trim()) {
      const startMins = this.#parseTimeToMinutes(this.startTimeTarget.value)
      if (startMins === null || endMins <= startMins) return
      this.durationTarget.value = this.#formatMinutesToDuration(endMins - startMins)
    } else {
      const durationMins = this.#parseDurationToMinutes(this.durationTarget.value)
      if (durationMins === null) return
      const startMins = endMins - durationMins
      if (startMins < 0) return
      if (this.hasStartTimeTarget) {
        this.startTimeTarget.value = this.#formatMinutesToTime(startMins)
      }
    }
  }

  confirmJiraReset(event) {
    if (this._submittingAfterJiraDecision) {
      this._submittingAfterJiraDecision = false
      return
    }
    if (!this.#shouldAskAboutJiraDelete()) return

    event.preventDefault()
    this._pendingSubmitter = event.submitter
    this.#openJiraResetModal()
  }

  deleteJiraWorklog(event) {
    event.preventDefault()
    this.#submitWithJiraDecision("1")
  }

  keepJiraWorklog(event) {
    event.preventDefault()
    this.#submitWithJiraDecision("0")
  }

  closeJiraResetModal(event) {
    event.preventDefault()
    this.#closeJiraResetModal()
  }

  #openJiraResetModal() {
    if (!this.hasJiraResetModalTarget) return

    this.jiraResetModalTarget.classList.remove("hidden")
    this.jiraResetModalTarget.querySelector("[data-jira-reset-primary]")?.focus()
  }

  #closeJiraResetModal() {
    if (!this.hasJiraResetModalTarget) return

    this.jiraResetModalTarget.classList.add("hidden")
  }

  #submitWithJiraDecision(value) {
    this.deleteJiraWorklogTarget.value = value
    this.#closeJiraResetModal()

    const form = this.deleteJiraWorklogTarget.form
    this._submittingAfterJiraDecision = true
    if (this._pendingSubmitter && form.requestSubmit) {
      form.requestSubmit(this._pendingSubmitter)
    } else if (form.requestSubmit) {
      form.requestSubmit()
    } else {
      form.submit()
    }
  }

  #shouldAskAboutJiraDelete() {
    if (!this.hasDeleteJiraWorklogTarget) return false
    if (!this.originalPushedValue || !this.originalJiraWorklogIdValue) return false

    return this.#jiraRelevantValuesChanged()
  }

  #jiraRelevantValuesChanged() {
    const taskChanged = this.hasTaskSelectTarget &&
      this.hasOriginalTaskIdValue &&
      String(this.taskSelectTarget.value) !== String(this.originalTaskIdValue)
    const startChanged = this.hasStartTimeTarget &&
      this.hasOriginalStartTimeValue &&
      this.startTimeTarget.value.trim() !== this.originalStartTimeValue
    const durationMins = this.#currentEffectiveDurationMinutes()
    const durationChanged = durationMins !== null &&
      this.hasOriginalEffectiveDurationMinutesValue &&
      durationMins !== this.originalEffectiveDurationMinutesValue

    return taskChanged || startChanged || durationChanged
  }

  #currentEffectiveDurationMinutes() {
    const startMins = this.hasStartTimeTarget ? this.#parseTimeToMinutes(this.startTimeTarget.value) : null
    const endMins = this.hasEndTimeTarget ? this.#parseTimeToMinutes(this.endTimeTarget.value) : null
    if (startMins !== null && endMins !== null && endMins > startMins) {
      return endMins - startMins
    }

    return this.hasDurationTarget ? this.#parseDurationToMinutes(this.durationTarget.value) : null
  }

  #parseDurationToMinutes(str) {
    if (!str) return null
    let total = 0
    const regex = /(\d+(?:\.\d+)?)\s*(h|m)/gi
    let match
    while ((match = regex.exec(str)) !== null) {
      const n = parseFloat(match[1])
      total += match[2].toLowerCase() === 'h' ? n * 60 : n
    }
    return total > 0 ? Math.round(total) : null
  }

  #parseTimeToMinutes(str) {
    if (!str || !/^\d{2}:\d{2}$/.test(str)) return null
    const [h, m] = str.split(':').map(Number)
    return h * 60 + m
  }

  #formatMinutesToDuration(totalMinutes) {
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  #formatMinutesToTime(mins) {
    const h = Math.floor(mins / 60) % 24
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
}
