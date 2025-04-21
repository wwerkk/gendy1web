let gendy1Node = null
let audioContext = null

const toggleButton = document.getElementById("toggleButton")
const icon = toggleButton.querySelector(".material-icons")
const sliders = document.querySelectorAll('input[type="range"]')

// XY Pad elements
const xyPad = document.getElementById("scaling-pad")
const xyHandle = document.getElementById("scaling-handle")
const ampscaleValue = document.getElementById("ampscale-value")
const durscaleValue = document.getElementById("durscale-value")

// Frequency Range elements
const freqRange = document.getElementById("freq-range")
const minFreqLine = document.getElementById("min-freq-line")
const maxFreqLine = document.getElementById("max-freq-line")
const minFreqValue = document.getElementById("minfreq-value")
const maxFreqValue = document.getElementById("maxfreq-value")

// XY Pad state
let isDragging = false
let ampscale = 0.5
let durscale = 0.5

// Frequency Range state
let isDraggingMin = false
let isDraggingMax = false
let minFreq = 20
let maxFreq = 800
const MIN_FREQ_LIMIT = 1
const MAX_FREQ_LIMIT = 5000

// Initialize XY Pad position
function updateHandlePosition() {
  const padRect = xyPad.getBoundingClientRect()
  const x = durscale * padRect.width
  const y = (1 - ampscale) * padRect.height // Invert Y axis for natural up=more feeling

  xyHandle.style.left = `${x}px`
  xyHandle.style.top = `${y}px`

  ampscaleValue.textContent = ampscale.toFixed(2)
  durscaleValue.textContent = durscale.toFixed(2)

  // Update audio parameters if available
  if (gendy1Node) {
    if (gendy1Node.parameters.has("ampscale")) {
      gendy1Node.parameters.get("ampscale").value = ampscale
    }
    if (gendy1Node.parameters.has("durscale")) {
      gendy1Node.parameters.get("durscale").value = durscale
    }
  }
}

// Initialize Frequency Range positions
function updateFrequencyLines() {
  const rangeHeight = freqRange.clientHeight

  // Calculate positions (bottom=low, top=high)
  const minPos = (1 - minFreq / MAX_FREQ_LIMIT) * rangeHeight
  const maxPos = (1 - maxFreq / MAX_FREQ_LIMIT) * rangeHeight

  minFreqLine.style.top = `${minPos}px`
  maxFreqLine.style.top = `${maxPos}px`

  minFreqValue.textContent = `${minFreq} Hz`
  maxFreqValue.textContent = `${maxFreq} Hz`

  // Update audio parameters if available
  if (gendy1Node) {
    if (gendy1Node.parameters.has("minfreq")) {
      gendy1Node.parameters.get("minfreq").value = minFreq
    }
    if (gendy1Node.parameters.has("maxfreq")) {
      gendy1Node.parameters.get("maxfreq").value = maxFreq
    }
  }
}

// Handle XY Pad interactions
function handleXYPadInteraction(event) {
  if (!isDragging && event.type !== "mousedown" && event.type !== "touchstart") return

  event.preventDefault()

  const padRect = xyPad.getBoundingClientRect()
  let clientX, clientY

  // Handle both mouse and touch events
  if (event.type.startsWith("touch")) {
    const touch = event.touches[0] || event.changedTouches[0]
    clientX = touch.clientX
    clientY = touch.clientY
  } else {
    clientX = event.clientX
    clientY = event.clientY
  }

  // Calculate normalized values (0-1)
  durscale = Math.max(0, Math.min(1, (clientX - padRect.left) / padRect.width))
  ampscale = Math.max(0, Math.min(1, 1 - (clientY - padRect.top) / padRect.height)) // Invert Y

  updateHandlePosition()
}

// Handle Frequency Range interactions
function handleFreqRangeInteraction(event, isMinLine) {
  if (!isDraggingMin && !isDraggingMax && event.type !== "mousedown" && event.type !== "touchstart") return

  if ((isMinLine && !isDraggingMin) || (!isMinLine && !isDraggingMax)) return

  event.preventDefault()

  const rangeRect = freqRange.getBoundingClientRect()
  let clientY

  // Handle both mouse and touch events
  if (event.type.startsWith("touch")) {
    const touch = event.touches[0] || event.changedTouches[0]
    clientY = touch.clientY
  } else {
    clientY = event.clientY
  }

  // Calculate position relative to container (top=0, bottom=height)
  const relativeY = clientY - rangeRect.top

  // Calculate frequency value (top=max, bottom=min)
  // Map position to frequency range (invert so top=high, bottom=low)
  const normalizedPos = relativeY / rangeRect.height
  const freq = Math.round((1 - normalizedPos) * MAX_FREQ_LIMIT)

  if (isMinLine) {
    // Ensure min frequency doesn't exceed max frequency
    minFreq = Math.max(MIN_FREQ_LIMIT, Math.min(maxFreq - 1, freq))
  } else {
    // Ensure max frequency doesn't go below min frequency
    maxFreq = Math.max(minFreq + 1, Math.min(MAX_FREQ_LIMIT, freq))
  }

  updateFrequencyLines()
}

// XY Pad event listeners
xyPad.addEventListener("mousedown", (e) => {
  isDragging = true
  handleXYPadInteraction(e)
})

xyPad.addEventListener("touchstart", (e) => {
  isDragging = true
  handleXYPadInteraction(e)
})

// Frequency Range event listeners
minFreqLine.addEventListener("mousedown", (e) => {
  isDraggingMin = true
  handleFreqRangeInteraction(e, true)
})

minFreqLine.addEventListener("touchstart", (e) => {
  isDraggingMin = true
  handleFreqRangeInteraction(e, true)
})

maxFreqLine.addEventListener("mousedown", (e) => {
  isDraggingMax = true
  handleFreqRangeInteraction(e, false)
})

maxFreqLine.addEventListener("touchstart", (e) => {
  isDraggingMax = true
  handleFreqRangeInteraction(e, false)
})

// Document-level event listeners for drag operations
document.addEventListener("mousemove", (e) => {
  if (isDragging) handleXYPadInteraction(e)
  if (isDraggingMin) handleFreqRangeInteraction(e, true)
  if (isDraggingMax) handleFreqRangeInteraction(e, false)
})

document.addEventListener("touchmove", (e) => {
  if (isDragging) handleXYPadInteraction(e)
  if (isDraggingMin) handleFreqRangeInteraction(e, true)
  if (isDraggingMax) handleFreqRangeInteraction(e, false)
})

document.addEventListener("mouseup", () => {
  isDragging = false
  isDraggingMin = false
  isDraggingMax = false
})

document.addEventListener("touchend", () => {
  isDragging = false
  isDraggingMin = false
  isDraggingMax = false
})

// Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Initialize XY pad position
  updateHandlePosition()

  // Initialize frequency lines
  updateFrequencyLines()

  sliders.forEach((slider) => {
    const display = document.getElementById(`${slider.id}-value`)
    slider.addEventListener("input", () => {
      let value = slider.value
      if (slider.id === "minfreq" || slider.id === "maxfreq") {
        value = `${value} Hz`
      }
      display.textContent = value

      if (gendy1Node && gendy1Node.parameters.has(slider.id)) {
        gendy1Node.parameters.get(slider.id).value = Number.parseFloat(slider.value)
      }
    })
  })

  toggleButton.addEventListener("click", async () => {
    if (!audioContext) {
      await initializeAudio()
      icon.textContent = "stop"
      toggleButton.classList.add("playing")
    } else {
      await audioContext.close()
      audioContext = null
      gendy1Node = null
      icon.textContent = "play_arrow"
      toggleButton.classList.remove("playing")
    }
  })
})

async function initializeAudio() {
  try {
    audioContext = new AudioContext()
    await audioContext.audioWorklet.addModule("processor.js")
    gendy1Node = new AudioWorkletNode(audioContext, "gendy1-processor")
    gendy1Node.connect(audioContext.destination)

    // Set initial values for sliders
    sliders.forEach((slider) => {
      if (gendy1Node.parameters.has(slider.id)) {
        gendy1Node.parameters.get(slider.id).value = Number.parseFloat(slider.value)
      }
    })

    // Set initial values for XY pad
    if (gendy1Node.parameters.has("ampscale")) {
      gendy1Node.parameters.get("ampscale").value = ampscale
    }
    if (gendy1Node.parameters.has("durscale")) {
      gendy1Node.parameters.get("durscale").value = durscale
    }

    // Set initial values for frequency range
    if (gendy1Node.parameters.has("minfreq")) {
      gendy1Node.parameters.get("minfreq").value = minFreq
    }
    if (gendy1Node.parameters.has("maxfreq")) {
      gendy1Node.parameters.get("maxfreq").value = maxFreq
    }
  } catch (error) {
    console.error("Error initializing:", error)
    alert("Failed to initialize audio. See console for details.")
  }
}
