import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "hidden", "dropdown", "list"]
  static values = { tasks: Array, createUrl: String, jiraFetchUrl: String }

  connect() {
    this._tasks = this.tasksValue
    this._selectedId = this.hiddenTarget.value || ""
    this._open = false
    this._outsideClickHandler = this._onOutsideClick.bind(this)
    document.addEventListener("click", this._outsideClickHandler)
  }

  disconnect() {
    document.removeEventListener("click", this._outsideClickHandler)
  }

  onFocus() {
    if (this._selectedId) {
      this.inputTarget.value = ""
    }
    this._render()
    this._show()
  }

  onInput() {
    this._selectedId = ""
    this.hiddenTarget.value = ""
    this._render()
    this._show()
  }

  _show() {
    this._open = true
    this.dropdownTarget.classList.remove("hidden")
  }

  _hide() {
    this._open = false
    this.dropdownTarget.classList.add("hidden")
    // restore selected task title if no new selection
    if (!this._selectedId) {
      this.inputTarget.value = ""
    } else {
      const t = this._tasks.find(t => String(t.id) === String(this._selectedId))
      if (t) this.inputTarget.value = this._label(t)
    }
  }

  _render() {
    const search = this.inputTarget.value.trim().toLowerCase()
    const isUrl = this._isUrl(this.inputTarget.value.trim())
    const filtered = search
      ? this._tasks.filter(t =>
          t.title.toLowerCase().includes(search) ||
          (t.jira_key && t.jira_key.toLowerCase().includes(search)) ||
          (t.jira_url && t.jira_url.toLowerCase().includes(search))
        )
      : this._tasks

    let html = ""

    if (search && !isUrl) {
      html += `
        <div class="border-b border-border px-2 py-1">
          <button type="button"
                  class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-lg hover:bg-accent/10 transition-colors"
                  data-action="click->task-selector#createPlain">
            <span class="text-accent font-medium shrink-0">Ny task</span>
            <span class="text-xs text-foreground-muted truncate">Skapar &quot;${this._escape(this.inputTarget.value.trim())}&quot; och väljer den</span>
          </button>
        </div>`
    }

    if (filtered.length > 0) {
      html += `<ul class="py-1">`
      filtered.forEach(t => {
        const active = String(t.id) === String(this._selectedId)
        html += `
          <li class="px-4 py-2 cursor-pointer transition-colors ${active ? "bg-accent/20 text-accent" : "hover:bg-background-card-hover"}"
              data-task-id="${t.id}"
              data-action="click->task-selector#select">
            <div class="font-medium text-sm text-foreground">${this._escape(t.title)}</div>
            ${t.jira_key ? `<div class="text-xs text-foreground-muted">${this._escape(t.jira_key)}</div>` : ""}
          </li>`
      })
      html += `</ul>`
    }

    if (search && isUrl) {
      html += `
        <div class="border-t border-border px-2 py-1">
          <button type="button"
                  class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-lg hover:bg-accent/10 transition-colors"
                  data-action="click->task-selector#createFromJira">
            <span class="text-accent font-medium shrink-0">Skapa från Jira-länk</span>
            <span class="text-xs text-foreground-muted truncate">Hämtar automatiskt titel och beskrivning</span>
          </button>
        </div>`
    }

    if (!html) {
      html = `<p class="px-4 py-3 text-sm text-foreground-muted">Inga tasks hittades</p>`
    }

    this.listTarget.innerHTML = html
  }

  select(event) {
    const li = event.currentTarget
    const id = li.dataset.taskId
    const task = this._tasks.find(t => String(t.id) === String(id))
    if (!task) return
    this._selectedId = id
    this.hiddenTarget.value = id
    this.hiddenTarget.dispatchEvent(new Event("change"))
    this.inputTarget.value = this._label(task)
    this._hide()
  }

  async createPlain() {
    const title = this.inputTarget.value.trim()
    if (!title) return
    await this._create({ title })
  }

  async createFromJira(event) {
    const jiraUrl = this.inputTarget.value.trim()
    if (!jiraUrl) return

    const btn = event?.currentTarget
    if (btn) btn.disabled = true

    try {
      const url = new URL(this.jiraFetchUrlValue, window.location.origin)
      url.searchParams.set("jira_url", jiraUrl)
      const resp = await fetch(url.toString(), { headers: { Accept: "application/json" } })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || "Okänt fel")

      const title = (data.summary || "").trim()
      if (!title) throw new Error("Jira-svaret saknar titel.")

      const description = data.description || ""

      await this._create({ title, description, jira_url: jiraUrl })
    } catch (err) {
      alert("Kunde inte hämta Jira-task: " + err.message)
      if (btn) btn.disabled = false
    }
  }

  async _create(attrs) {
    const btn = this.listTarget.querySelector("button")
    if (btn) btn.disabled = true

    try {
      const body = new FormData()
      Object.entries(attrs).forEach(([k, v]) => body.append(`task[${k}]`, v))
      const resp = await fetch(this.createUrlValue, {
        method: "POST",
        headers: { Accept: "application/json", "X-CSRF-Token": this._csrf() },
        body
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || "Okänt fel")

      this._tasks = [...this._tasks, data]
      this._selectedId = String(data.id)
      this.hiddenTarget.value = data.id
      this.hiddenTarget.dispatchEvent(new Event("change"))
      this.inputTarget.value = this._label(data)
      this._hide()
    } catch (err) {
      alert("Kunde inte skapa task: " + err.message)
      if (btn) btn.disabled = false
    }
  }

  _label(task) {
    return task.jira_key ? `[${task.jira_key}] ${task.title}` : task.title
  }

  _isUrl(str) {
    try { return ["http:", "https:"].includes(new URL(str).protocol) } catch { return false }
  }

  _escape(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  _csrf() {
    return document.querySelector('meta[name="csrf-token"]')?.content || ""
  }

  _onOutsideClick(e) {
    if (!this._open) return
    if (!this.element.contains(e.target)) this._hide()
  }
}
