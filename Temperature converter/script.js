/* ============================================================
   Temperature Converter – vanilla JavaScript
   Checklist coverage:
   1. Numeric input + validation (real-time, error message)
   2. Input unit selector (radio buttons: C / F / K)
   3. All output units shown simultaneously
   4. Convert button (click) – Enter key also works
   5. Result area with unit labels
   6. Absolute-zero edge case with friendly message
   7. Centred UI (see style.css)
   ============================================================ */

(function () {
  "use strict";

  // ---- Constants ----
  const ABS_ZERO_C = -273.15;
  const CIRCUMFERENCE = 2 * Math.PI * 80; // matches the SVG ring (r = 80)
  const GAUGE_MIN_C = -50;                // gauge ring spans -50°C … 150°C
  const GAUGE_MAX_C = 150;

  // ---- DOM references ----
  const input      = document.getElementById("tempInput");
  const inputWrap  = document.getElementById("inputWrap");
  const errorMsg   = document.getElementById("errorMsg");
  const convertBtn = document.getElementById("convertBtn");
  const resetBtn   = document.getElementById("resetBtn");
  const notice     = document.getElementById("notice");
  const dialFill   = document.getElementById("dialFill");
  const dialValue  = document.getElementById("dialValue");
  const dialCaption = document.getElementById("dialCaption");
  const unitRadios = document.querySelectorAll('input[name="unit"]');
  const outputs = {
    C: document.getElementById("outC"),
    F: document.getElementById("outF"),
    K: document.getElementById("outK"),
  };
  const resultItems = document.querySelectorAll(".result");

  const UNIT_NAMES = { C: "Celsius", F: "Fahrenheit", K: "Kelvin" };
  const UNIT_SYMBOLS = { C: "°C", F: "°F", K: "K" };

  // ---- Conversion helpers (everything goes through Celsius) ----
  function toCelsius(value, unit) {
    switch (unit) {
      case "C": return value;
      case "F": return (value - 32) * 5 / 9;
      case "K": return value - 273.15;
    }
  }

  function fromCelsius(c) {
    return {
      C: c,
      F: c * 9 / 5 + 32,
      K: c + 273.15,
    };
  }

  // Round to 2 decimals and drop trailing zeros; avoid "-0"
  function format(n) {
    let r = Math.round((n + Number.EPSILON) * 100) / 100;
    if (Object.is(r, -0)) r = 0;
    return r.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  // ---- Validation ----
  // Returns { valid, value, message }
  function validate(raw) {
    const text = raw.trim();

    if (text === "") {
      return { valid: false, empty: true, message: "Please enter a temperature value." };
    }

    // Strict numeric pattern: optional sign, digits, optional decimal, optional exponent
    const numeric = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
    if (!numeric.test(text)) {
      return {
        valid: false,
        message: "Invalid input: please enter numbers only (e.g. 25, -3.5).",
      };
    }

    const value = Number(text);
    if (!Number.isFinite(value)) {
      return { valid: false, message: "That number is too large to convert." };
    }

    return { valid: true, value };
  }

  function getUnit() {
    return document.querySelector('input[name="unit"]:checked').value;
  }

  // Absolute zero check – returns true if the value is physically impossible
  function belowAbsoluteZero(value, unit) {
    return toCelsius(value, unit) < ABS_ZERO_C - 1e-9;
  }

  function absoluteZeroText(unit) {
    const limits = { C: "−273.15 °C", F: "−459.67 °F", K: "0 K" };
    return (
      "Below absolute zero! Nothing can be colder than " + limits[unit] +
      ". Please enter a higher value."
    );
  }

  // ---- UI state helpers ----
  function showError(message) {
    errorMsg.textContent = message;
    inputWrap.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
  }

  function clearError() {
    errorMsg.textContent = "";
    inputWrap.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
  }

  function setNotice(html, type) {
    notice.innerHTML = html;
    notice.className = "notice" + (type ? " " + type : "");
  }

  function clearResults() {
    Object.values(outputs).forEach((el) => (el.textContent = "--"));
    resultItems.forEach((li) => li.classList.remove("is-source"));
    dialFill.style.strokeDashoffset = CIRCUMFERENCE;
    dialFill.style.stroke = "";
    dialValue.textContent = "--";
    dialCaption.textContent = "Enter a value to begin";
  }

  function shake() {
    inputWrap.classList.remove("shake");
    void inputWrap.offsetWidth; // restart animation
    inputWrap.classList.add("shake");
  }

  // Real-time validation as the user types / changes unit
  function liveValidate() {
    const raw = input.value;
    if (raw.trim() === "") {
      clearError();
      return;
    }
    const result = validate(raw);
    if (!result.valid) {
      showError(result.message);
      return;
    }
    if (belowAbsoluteZero(result.value, getUnit())) {
      showError(absoluteZeroText(getUnit()));
      return;
    }
    clearError();
  }

  // ---- Gauge ----
  function updateGauge(celsius) {
    const clamped = Math.min(Math.max(celsius, GAUGE_MIN_C), GAUGE_MAX_C);
    const fraction = (clamped - GAUGE_MIN_C) / (GAUGE_MAX_C - GAUGE_MIN_C);
    dialFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);

    // Colour hint: cool → mint, warm → amber, hot → coral
    if (celsius <= 0) dialFill.style.stroke = "#7dd3fc";
    else if (celsius < 30) dialFill.style.stroke = "#5eead4";
    else if (celsius < 60) dialFill.style.stroke = "#fcd34d";
    else dialFill.style.stroke = "#ff7a8a";

    dialValue.textContent = format(celsius);

    let caption;
    if (celsius <= 0) caption = "Freezing";
    else if (celsius < 15) caption = "Cold";
    else if (celsius < 26) caption = "Comfortable";
    else if (celsius < 38) caption = "Warm";
    else if (celsius < 100) caption = "Hot";
    else caption = "Boiling point or beyond";
    dialCaption.textContent = caption;
  }

  // ---- Main convert action (Checklist 4) ----
  function convert() {
    const result = validate(input.value);

    if (!result.valid) {
      showError(result.message);
      clearResults();
      setNotice("Fix the error above and try again.", "warn");
      shake();
      input.focus();
      return;
    }

    const unit = getUnit();

    // Edge case: below absolute zero (Checklist 6)
    if (belowAbsoluteZero(result.value, unit)) {
      const msg = absoluteZeroText(unit);
      showError(msg);
      clearResults();
      setNotice(msg, "warn");
      shake();
      return;
    }

    clearError();

    const celsius = toCelsius(result.value, unit);
    const all = fromCelsius(celsius);

    // Show every unit at once (Checklist 3 & 5)
    ["C", "F", "K"].forEach((u) => {
      outputs[u].textContent = format(all[u]) + " " + UNIT_SYMBOLS[u];
    });

    resultItems.forEach((li) => {
      li.classList.toggle("is-source", li.dataset.unit === unit);
      li.classList.remove("pop");
      void li.offsetWidth;
      li.classList.add("pop");
    });

    updateGauge(celsius);

    let message =
      "<strong>" + format(result.value) + " " + UNIT_SYMBOLS[unit] + "</strong> (" +
      UNIT_NAMES[unit] + ") converted to all units.";
    if (Math.abs(celsius - ABS_ZERO_C) < 1e-9) {
      message += " That is exactly absolute zero!";
    }
    setNotice(message, "ok");
  }

  // ---- Reset ----
  function reset() {
    input.value = "";
    document.getElementById("unitC").checked = true;
    clearError();
    clearResults();
    setNotice("Press <strong>Convert</strong> to see all three units.", "");
    input.focus();
  }

  // ---- Copy buttons ----
  document.querySelectorAll(".copy").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = document.getElementById(btn.dataset.copy).textContent;
      if (text === "--") return;
      const original = btn.textContent;
      const done = () => {
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = original), 1200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => {});
      }
    });
  });

  // ---- Event wiring ----
  input.addEventListener("input", liveValidate);
  unitRadios.forEach((r) => r.addEventListener("change", liveValidate));
  convertBtn.addEventListener("click", convert);
  resetBtn.addEventListener("click", reset);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") convert();
  });

  // Initial state
  clearResults();
  input.focus();
})();