import { Controller } from "@hotwired/stimulus"
import EasyMDE from "easymde"

export default class extends Controller {
  static targets = ["textarea"]

  connect() {
    if (!this.hasTextareaTarget) return

    this.editor = new EasyMDE({
      element: this.textareaTarget,
      spellChecker: false,
      autosave: { enabled: false },
      toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "|", "preview", "guide"],
      minHeight: "120px",
      status: false
    })

    this._keydownHandler = this.handleKeydown.bind(this)
    this.element.addEventListener("keydown", this._keydownHandler)
  }

  disconnect() {
    this.editor?.toTextArea()
    this.editor = null
    this.element.removeEventListener("keydown", this._keydownHandler)
  }

  handleKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault()
      this.element.closest("form")?.requestSubmit()
    }
  }

  // Sync EasyMDE value back to textarea before form submit
  beforeSubmit() {
    if (this.editor) {
      this.textareaTarget.value = this.editor.value()
    }
  }
}
