import { Controller } from "@hotwired/stimulus"
import { visit } from "@hotwired/turbo"

export default class extends Controller {
  navigate(e) {
    const url = new URL(window.location)
    url.searchParams.set("date", e.target.value)
    visit(url.toString(), { frame: "dashboard-frame" })
  }
}
