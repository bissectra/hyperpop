const PRESETS = {
  qwerty: {
    forward: "W",
    backward: "S",
    up: "I",
    down: "K",
    left: "A",
    right: "D",
    ana: "J",
    kata: "L",
    rotateXY: "1",
    rotateXZ: "2",
    rotateYZ: "3",
    rotateXW: "8",
    rotateYW: "9",
    rotateZW: "0",
    shoot: "Space",
  },
  azerty: {
    forward: "Z",
    backward: "S",
    up: "I",
    down: "K",
    left: "Q",
    right: "D",
    ana: "J",
    kata: "L",
    rotateXY: "1",
    rotateXZ: "2",
    rotateYZ: "3",
    rotateXW: "8",
    rotateYW: "9",
    rotateZW: "0",
    shoot: "Space",
  },
};

function getKeyCode(key) {
  if (key === 'Space') return 32;
  if (key === 'Return' || key === 'Enter') return 13;
  if (key === 'ArrowUp') return 38;
  if (key === 'ArrowDown') return 40;
  if (key === 'ArrowLeft') return 37;
  if (key === 'ArrowRight') return 39;
  if (key.length === 1) return key.toUpperCase().charCodeAt(0);
  return 0;
}

const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const closeBtn = document.getElementById("close-settings");

function toggleSettings(open) {
  settingsPanel.classList.toggle("hidden", !open);
}

function formatKey(key) {
  if (!key || typeof key !== "string") return "";

  const allowedSpecials = {
    " ": "Space",
    Enter: "Return",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
  };

  if (allowedSpecials[key]) return allowedSpecials[key];

  // Accept single letter or number
  if (/^[a-zA-Z0-9]$/.test(key)) {
    return key.toUpperCase();
  }

  // All others are invalid
  return "";
}

function setupBindingInputs() {
  const inputs = document.querySelectorAll("#settings-panel input");
  inputs.forEach((input) => {
    input.addEventListener("keydown", (e) => {
      e.preventDefault();
      const formattedKey = formatKey(e.key);
      input.value = formattedKey;

      const bindingName = input.id.replace("key-", "");
      if (bindingName && typeof bindings === "object") {
        bindings[bindingName] = formattedKey;
      }
    });

    input.addEventListener("focus", () => {
      const currentValue = input.value;
      input.value = "";
      input.addEventListener(
        "blur",
        () => {
          if (!input.value) {
            input.value = currentValue;
          }
        },
        { once: true }
      );
    });
  });
}

settingsBtn.addEventListener("click", () => toggleSettings(true));
closeBtn.addEventListener("click", () => toggleSettings(false));

// Click outside closes panel
document.addEventListener("click", (e) => {
  const isInside = settingsPanel.contains(e.target);
  const isSettingsButton = settingsBtn.contains(e.target);

  if (
    !isInside &&
    !isSettingsButton &&
    !settingsPanel.classList.contains("hidden")
  ) {
    toggleSettings(false);
  }
});

// Escape key closes panel
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !settingsPanel.classList.contains("hidden")) {
    toggleSettings(false);
  }
});

setupBindingInputs();

function applyPreset(preset) {
  const presetBindings = PRESETS[preset];
  if (!presetBindings) return;
  Object.entries(presetBindings).forEach(([key, value]) => {
    const input = document.getElementById(`key-${key}`);
    if (input) input.value = value;
    if (typeof window.bindings === "object") window.bindings[key] = value;
  });
}

document.getElementById("preset-qwerty").onclick = () => applyPreset("qwerty");
document.getElementById("preset-azerty").onclick = () => applyPreset("azerty");
