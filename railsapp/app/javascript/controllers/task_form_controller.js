import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["title", "jiraUrl", "description", "fetchBtn"]
  static values = { jiraFetchUrl: String }

  connect() {
    this.checkJiraUrl()
  }

  onTitleInput() {
    const val = this.titleTarget.value.trim()
    // If user pastes a Jira URL into title, auto-move it to jiraUrl field
    if (val.match(/https?:\/\/.+\/browse\/[A-Z]+-\d+/i)) {
      this.jiraUrlTarget.value = val
      this.titleTarget.value = ""
      this.checkJiraUrl()
    } else {
      this.checkJiraUrl()
    }
  }

  checkJiraUrl() {
    const hasJira = this.jiraUrlTarget.value.trim().length > 0
    if (this.hasFetchBtnTarget) {
      this.fetchBtnTarget.classList.toggle("hidden", !hasJira)
    }
  }

  async fetchJira() {
    const jiraUrl = this.jiraUrlTarget.value.trim()
    if (!jiraUrl) return

    const feedback = this.element.querySelector("#task-form-feedback")
    if (feedback) {
      feedback.className = "text-sm text-foreground-muted"
      feedback.textContent = "Hämtar från Jira…"
      feedback.classList.remove("hidden")
    }

    try {
      const url = new URL(this.jiraFetchUrlValue, window.location.origin)
      url.searchParams.set("jira_url", jiraUrl)
      const resp = await fetch(url.toString(), {
        headers: { "Accept": "application/json" }
      })
      const data = await resp.json()

      if (!resp.ok) throw new Error(data.error || "Okänt fel")

      if (data.summary) this.titleTarget.value = data.summary
      if (data.description && this.hasDescriptionTarget) {
        this.descriptionTarget.value = data.description
      }

      if (feedback) {
        feedback.className = "text-sm text-success"
        feedback.textContent = "Hämtat från Jira!"
      }
    } catch (err) {
      if (feedback) {
        feedback.className = "text-sm text-danger"
        feedback.textContent = err.message
      }
    }
  }
}
