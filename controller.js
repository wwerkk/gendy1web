let gendy1Node = null;
let audioContext = null;

const toggleButton = document.getElementById('toggleButton');
const icon = toggleButton.querySelector(".material-icons");
const sliders = document.querySelectorAll('input[type="range"]');

const xyPad = document.getElementById('scaling-pad');
const xyHandle = document.getElementById('scaling-handle');
const ampscaleValue = document.getElementById('ampscale-value');
const durscaleValue = document.getElementById('durscale-value');

let isDragging = false;
let ampscale = 0.5;
let durscale = 0.5;

function updateHandlePosition() {
  const padRect = xyPad.getBoundingClientRect();
  const x = durscale * padRect.width;
  const y = (1 - ampscale) * padRect.height;

  xyHandle.style.left = `${x}px`;
  xyHandle.style.top = `${y}px`;

  ampscaleValue.textContent = ampscale.toFixed(2);
  durscaleValue.textContent = durscale.toFixed(2);

  if (gendy1Node) {
    if (gendy1Node.parameters.has("ampscale")) {
      gendy1Node.parameters.get("ampscale").value = ampscale;
    }
    if (gendy1Node.parameters.has("durscale")) {
      gendy1Node.parameters.get("durscale").value = durscale;
    }
  }
}

function handleXYPadInteraction(event) {
  if (!isDragging && event.type !== "mousedown" && event.type !== "touchstart") return;

  event.preventDefault();

  const padRect = xyPad.getBoundingClientRect();
  let clientX, clientY;

  // Handle both mouse and touch events
  if (event.type.startsWith("touch")) {
    const touch = event.touches[0] || event.changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  // Calculate normalized values (0-1)
  durscale = Math.max(0, Math.min(1, (clientX - padRect.left) / padRect.width));
  ampscale = Math.max(0, Math.min(1, 1 - (clientY - padRect.top) / padRect.height));

  updateHandlePosition();
}

xyPad.addEventListener("mousedown", (e) => {
  isDragging = true;
  handleXYPadInteraction(e);
});

xyPad.addEventListener("touchstart", (e) => {
  isDragging = true;
  handleXYPadInteraction(e);
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) handleXYPadInteraction(e);
});

document.addEventListener("touchmove", (e) => {
  if (isDragging) handleXYPadInteraction(e);
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

document.addEventListener("touchend", () => {
  isDragging = false;
});

// Listeners
document.addEventListener('DOMContentLoaded', function () {
  updateHandlePosition()
  sliders.forEach((slider) => {
    const display = document.getElementById(`${slider.id}-value`);
    slider.addEventListener('input', () => {
      let value = slider.value;
      if (slider.id === 'minfreq' || slider.id === 'maxfreq') {
        value = `${value} Hz`;
      }
      display.textContent = value;

      if (gendy1Node && gendy1Node.parameters.has(slider.id)) {
        gendy1Node.parameters.get(slider.id).value = parseFloat(slider.value);
      }
    });
  });

  toggleButton.addEventListener("click", async () => {
    if (!audioContext) {
      await initializeAudio();
      icon.textContent = "stop";
      toggleButton.classList.add("playing");
    } else {
      await audioContext.close();
      audioContext = null;
      gendy1Node = null;
      icon.textContent = "play_arrow";
      toggleButton.classList.remove("playing");
    }
  });
});

async function initializeAudio() {
  try {
    audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule('processor.js');
    gendy1Node = new AudioWorkletNode(audioContext, 'gendy1-processor');
    gendy1Node.connect(audioContext.destination);
    sliders.forEach(slider => {
      if (gendy1Node.parameters.has(slider.id)) {
        gendy1Node.parameters.get(slider.id).value = parseFloat(slider.value);
      }
    });

    if (gendy1Node.parameters.has("ampscale")) {
      gendy1Node.parameters.get("ampscale").value = ampscale;
    }
    if (gendy1Node.parameters.has("durscale")) {
      gendy1Node.parameters.get("durscale").value = durscale;
    }
  } catch (error) {
    console.error('Error initializing:', error);
    alert('Failed to initialize audio. See console for details.');
  }
}