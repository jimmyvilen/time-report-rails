import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tab", "panel"]

  show(event) {
    const panelId = event.currentTarget.dataset.tabsPanel

    this.panelTargets.forEach(panel => {
      panel.classList.toggle("hidden", panel.id !== panelId)
    })

    this.tabTargets.forEach(tab => {
      const active = tab.dataset.tabsPanel === panelId
      tab.className = tab.className
        .replace(/bg-accent\s+text-white/g, "text-foreground-muted hover:text-foreground")
        .replace(/text-foreground-muted\s+hover:text-foreground/g, "text-foreground-muted hover:text-foreground")
      if (active) {
        tab.classList.remove("text-foreground-muted", "hover:text-foreground")
        tab.classList.add("bg-accent", "text-white")
      } else {
        tab.classList.remove("bg-accent", "text-white")
        tab.classList.add("text-foreground-muted", "hover:text-foreground")
      }
    })
  }
}
