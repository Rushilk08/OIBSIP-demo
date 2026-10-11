(function () {
  "use strict";

  // ---- Constants ----
  const ABS_ZERO_C = -273.15;

  // ---- DOM references ----
  const input      = document.getElementById("tempInput");
  const inputWrap  = document.getElementById("inputWrap");
  const errorMsg   = document.getElementById("errorMsg");
  const convertBtn = document.getElementById("convertBtn");
  const resetBtn   = document.getElementById("resetBtn");
  const notice     = document.getElementById("notice");
  const badge      = document.getElementById("tempBadge");
  const badgeLabel = document.getElementById("badgeLabel");
  const unitRadios = document.querySelectorAll('input[name="unit"]');
  const outputs = {
    C: document.getElementById("outC"),
    F: document.getElementById("outF"),
    K: document.getElementById("outK"),
  };
  const resultItems = document.querySelectorAll(".result");

  const UNIT_NAMES = { C: "Celsius", F: "Fahrenheit", K: "Kelvin" };
  const UNIT_SYMBOLS = { C: "°C", F: "°F", K: "K" };

  // ---- Dynamic temperature icon (snowflake / thermometer / flame) ----
  const COLD_BELOW_C = 15;   // below this  -> snowflake
  const HOT_FROM_C   = 35;   // this & above -> flame; in between -> thermometer

  // Pass a Celsius value, or null to return to the idle state
  function setBadge(celsius) {
    let state, label;
    if (celsius === null) {
      state = "idle";
      label = "Waiting for a value";
    } else if (celsius < COLD_BELOW_C) {
      state = "cold";
      label = "Cold · below " + COLD_BELOW_C + " °C";
    } else if (celsius < HOT_FROM_C) {
      state = "moderate";
      label = "Moderate · " + COLD_BELOW_C + "–" + HOT_FROM_C + " °C";
    } else {
      state = "hot";
      label = "Hot · " + HOT_FROM_C + " °C and above";
    }

    if (badge.dataset.state !== state) {
      badge.dataset.state = state;
      badge.classList.remove("swap");
      void badge.offsetWidth; // restart the pop animation
      badge.classList.add("swap");
    }
    badgeLabel.textContent = label;
    badge.setAttribute("aria-label", "Temperature status: " + label);
  }

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
    setBadge(null);
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

    setBadge(celsius);

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