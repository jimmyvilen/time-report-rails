import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  input(event) {
    let val = event.target.value.replace(/[^\d:]/g, "")
    const digits = val.replace(/:/g, "")
    if (digits.length >= 3 && !val.includes(":")) {
      val = digits.slice(0, 2) + ":" + digits.slice(2, 4)
    }
    event.target.value = val.slice(0, 5)
  }

  blur(event) {
    const val = event.target.value
    if (val && !/^([01]\d|2[0-3]):[0-5]\d$/.test(val)) {
      event.target.setCustomValidity("Ogiltigt tidsformat (HH:MM)")
      event.target.reportValidity()
    } else {
      event.target.setCustomValidity("")
    }
  }

  connect() {
    this._inputHandler = this.input.bind(this)
    this._blurHandler  = this.blur.bind(this)
    this.element.addEventListener("input", this._inputHandler)
    this.element.addEventListener("blur",  this._blurHandler)
  }

  disconnect() {
    this.element.removeEventListener("input", this._inputHandler)
    this.element.removeEventListener("blur",  this._blurHandler)
  }
}
