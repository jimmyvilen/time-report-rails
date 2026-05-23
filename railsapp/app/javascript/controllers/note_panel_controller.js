import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel"]

  toggle() {
    this.panelTarget.classList.toggle("hidden")

    if (!this.panelTarget.classList.contains("hidden")) {
      const cm = this.panelTarget.querySelector(".CodeMirror")?.CodeMirror
      if (cm) cm.refresh()
    }
  }
}
