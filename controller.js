/**
 * Gendy1Web Controller
 *
 * This file handles the user interface and audio processing for the Gendy1 synthesizer.
 * It manages the XY pad for amplitude and duration scaling, frequency range controls,
 * and audio worklet initialization.
 */

// Audio context and node references
let audioContext = null
let gendy1Node = null

// DOM Elements
const elements = {
  // Main controls
  toggleButton: document.getElementById("toggleButton"),
  playIcon: document.querySelector("#toggleButton .material-icons"),
  knumSlider: document.getElementById("knum"),
  knumValue: document.getElementById("knum-value"),

  // XY Pad elements
  xyPad: document.getElementById("scaling-pad"),
  xyHandle: document.getElementById("scaling-handle"),
  ampscaleValue: document.getElementById("ampscale-value"),
  durscaleValue: document.getElementById("durscale-value"),

  // Frequency Range elements
  freqRange: document.getElementById("freq-range"),
  minFreqLine: document.getElementById("min-freq-line"),
  maxFreqLine: document.getElementById("max-freq-line"),
  minFreqValue: document.getElementById("minfreq-value"),
  maxFreqValue: document.getElementById("maxfreq-value"),
}

// Parameter state
const state = {
  // XY Pad state - separate touch identifiers for multitouch
  xyTouchId: null,
  isDraggingXY: false,
  ampscale: 0.5,
  durscale: 0.5,

  // Frequency Range state - separate touch identifiers for multitouch
  minFreqTouchId: null,
  maxFreqTouchId: null,
  isDraggingMinFreq: false,
  isDraggingMaxFreq: false,
  minFreq: 20,
  maxFreq: 800,

  // Constants
  MIN_FREQ_LIMIT: 20,
  MAX_FREQ_LIMIT: 5000,
}

/**
 * Converts a linear position (0-1) to a logarithmic frequency
 * @param {number} position - Normalized position (0-1)
 * @returns {number} - Frequency value
 */
function positionToFrequency(position) {
  // Log scale conversion (position 0 = MIN_FREQ_LIMIT, position 1 = MAX_FREQ_LIMIT)
  const minLog = Math.log(state.MIN_FREQ_LIMIT)
  const maxLog = Math.log(state.MAX_FREQ_LIMIT)
  const scale = position * (maxLog - minLog) + minLog
  return Math.round(Math.exp(scale))
}

/**
 * Converts a frequency to a normalized position (0-1)
 * @param {number} freq - Frequency value
 * @returns {number} - Normalized position (0-1)
 */
function frequencyToPosition(freq) {
  const minLog = Math.log(state.MIN_FREQ_LIMIT)
  const maxLog = Math.log(state.MAX_FREQ_LIMIT)
  return (Math.log(freq) - minLog) / (maxLog - minLog)
}

/**
 * Updates the XY pad handle position based on current ampscale and durscale values
 */
function updateXYPadDisplay() {
  const padRect = elements.xyPad.getBoundingClientRect()
  const x = state.durscale * padRect.width
  const y = (1 - state.ampscale) * padRect.height // Invert Y axis for natural up=more feeling

  elements.xyHandle.style.left = `${x}px`
  elements.xyHandle.style.top = `${y}px`
  elements.ampscaleValue.textContent = state.ampscale.toFixed(2)
  elements.durscaleValue.textContent = state.durscale.toFixed(2)

  updateAudioParameter("ampscale", state.ampscale)
  updateAudioParameter("durscale", state.durscale)
}

/**
 * Updates the frequency lines position based on current minFreq and maxFreq values
 */
function updateFrequencyDisplay() {
  const rangeHeight = elements.freqRange.getBoundingClientRect().height

  // Calculate positions using logarithmic scale (top=high, bottom=low)
  const minPos = (1 - frequencyToPosition(state.minFreq)) * rangeHeight
  const maxPos = (1 - frequencyToPosition(state.maxFreq)) * rangeHeight

  elements.minFreqLine.style.top = `${minPos}px`
  elements.maxFreqLine.style.top = `${maxPos}px`

  elements.minFreqValue.textContent = `${state.minFreq} Hz`
  elements.maxFreqValue.textContent = `${state.maxFreq} Hz`

  updateAudioParameter("minfreq", state.minFreq)
  updateAudioParameter("maxfreq", state.maxFreq)
}

/**
 * Updates an audio parameter if the audio context is active
 * @param {string} paramName - The name of the parameter to update
 * @param {number} value - The new value for the parameter
 */
function updateAudioParameter(paramName, value) {
  if (gendy1Node && gendy1Node.parameters.has(paramName)) {
    gendy1Node.parameters.get(paramName).value = value
  }
}

/**
 * Handles XY Pad interaction events (mouse/touch)
 * @param {Event} event - The interaction event
 */
function handleXYPadInteraction(event) {
  // For mouse events
  if (event.type === "mousedown") {
    state.isDraggingXY = true
  } else if (event.type === "mousemove" && !state.isDraggingXY) {
    return
  }

  // For touch events - ensure we're tracking the correct touch
  if (event.type === "touchstart") {
    if (state.xyTouchId !== null) return // Already tracking a touch
    state.xyTouchId = event.touches[0].identifier
    state.isDraggingXY = true
  } else if (event.type === "touchmove") {
    if (!state.isDraggingXY) return

    // Find our tracked touch
    let touchFound = false
    for (let i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier === state.xyTouchId) {
        touchFound = true
        break
      }
    }
    if (!touchFound) return
  }

  event.preventDefault()

  const padRect = elements.xyPad.getBoundingClientRect()
  let clientX, clientY

  // Handle both mouse and touch events
  if (event.type.startsWith("touch")) {
    // Find the touch we're tracking
    let touch = null
    for (let i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier === state.xyTouchId) {
        touch = event.touches[i]
        break
      }
    }
    if (!touch && event.changedTouches) {
      for (let i = 0; i < event.changedTouches.length; i++) {
        if (event.changedTouches[i].identifier === state.xyTouchId) {
          touch = event.changedTouches[i]
          break
        }
      }
    }
    if (!touch) return

    clientX = touch.clientX
    clientY = touch.clientY
  } else {
    clientX = event.clientX
    clientY = event.clientY
  }

  // Calculate normalized values (0-1)
  state.durscale = Math.max(0, Math.min(1, (clientX - padRect.left) / padRect.width))
  state.ampscale = Math.max(0, Math.min(1, 1 - (clientY - padRect.top) / padRect.height)) // Invert Y

  updateXYPadDisplay()
}

/**
 * Handles Frequency Range interaction events (mouse/touch)
 * @param {Event} event - The interaction event
 * @param {boolean} isMinLine - Whether the interaction is with the min frequency line
 */
function handleFreqRangeInteraction(event, isMinLine) {
  // For mouse events
  if (event.type === "mousedown") {
    if (isMinLine) {
      state.isDraggingMinFreq = true
    } else {
      state.isDraggingMaxFreq = true
    }
  } else if (event.type === "mousemove") {
    if (isMinLine && !state.isDraggingMinFreq) return
    if (!isMinLine && !state.isDraggingMaxFreq) return
  }

  // For touch events - ensure we're tracking the correct touch
  if (event.type === "touchstart") {
    if (isMinLine) {
      if (state.minFreqTouchId !== null) return // Already tracking a touch
      state.minFreqTouchId = event.touches[0].identifier
      state.isDraggingMinFreq = true
    } else {
      if (state.maxFreqTouchId !== null) return // Already tracking a touch
      state.maxFreqTouchId = event.touches[0].identifier
      state.isDraggingMaxFreq = true
    }
  } else if (event.type === "touchmove") {
    const touchId = isMinLine ? state.minFreqTouchId : state.maxFreqTouchId
    if (touchId === null) return

    // Find our tracked touch
    let touchFound = false
    for (let i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier === touchId) {
        touchFound = true
        break
      }
    }
    if (!touchFound) return
  }

  event.preventDefault()

  const rangeRect = elements.freqRange.getBoundingClientRect()
  let clientY

  // Handle both mouse and touch events
  if (event.type.startsWith("touch")) {
    const touchId = isMinLine ? state.minFreqTouchId : state.maxFreqTouchId

    // Find the touch we're tracking
    let touch = null
    for (let i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier === touchId) {
        touch = event.touches[i]
        break
      }
    }
    if (!touch && event.changedTouches) {
      for (let i = 0; i < event.changedTouches.length; i++) {
        if (event.changedTouches[i].identifier === touchId) {
          touch = event.changedTouches[i]
          break
        }
      }
    }
    if (!touch) return

    clientY = touch.clientY
  } else {
    clientY = event.clientY
  }

  // Calculate position relative to container
  const relativeY = clientY - rangeRect.top
  const normalizedY = 1 - relativeY / rangeRect.height // Invert for natural mapping

  // Calculate frequency value using logarithmic scale
  const freq = positionToFrequency(normalizedY)

  if (isMinLine) {
    // Ensure min frequency doesn't exceed max frequency
    state.minFreq = Math.max(state.MIN_FREQ_LIMIT, Math.min(state.maxFreq - 1, freq))
  } else {
    // Ensure max frequency doesn't go below min frequency
    state.maxFreq = Math.max(state.minFreq + 1, Math.min(state.MAX_FREQ_LIMIT, freq))
  }

  updateFrequencyDisplay()
}

/**
 * Resets touch tracking when touches end
 * @param {Event} event - The touch end event
 */
function handleTouchEnd(event) {
  // Check if our tracked touches have ended
  for (let i = 0; i < event.changedTouches.length; i++) {
    const id = event.changedTouches[i].identifier

    if (id === state.xyTouchId) {
      state.xyTouchId = null
      state.isDraggingXY = false
    }

    if (id === state.minFreqTouchId) {
      state.minFreqTouchId = null
      state.isDraggingMinFreq = false
    }

    if (id === state.maxFreqTouchId) {
      state.maxFreqTouchId = null
      state.isDraggingMaxFreq = false
    }
  }
}

/**
 * Initializes the audio context and worklet
 */
async function initializeAudio() {
  try {
    audioContext = new AudioContext()
    await audioContext.audioWorklet.addModule("processor.js")
    gendy1Node = new AudioWorkletNode(audioContext, "gendy1-processor")
    gendy1Node.connect(audioContext.destination)

    // Set initial parameter values
    updateAudioParameter("ampscale", state.ampscale)
    updateAudioParameter("durscale", state.durscale)
    updateAudioParameter("minfreq", state.minFreq)
    updateAudioParameter("maxfreq", state.maxFreq)
    updateAudioParameter("knum", Number.parseInt(elements.knumSlider.value))

    // Update UI to reflect playing state
    elements.playIcon.textContent = "stop"
    elements.toggleButton.classList.add("playing")
  } catch (error) {
    console.error("Error initializing audio:", error)
    alert("Failed to initialize audio. See console for details.")
  }
}

/**
 * Stops audio playback and cleans up resources
 */
async function stopAudio() {
  if (audioContext) {
    await audioContext.close()
    audioContext = null
    gendy1Node = null

    // Update UI to reflect stopped state
    elements.playIcon.textContent = "play_arrow"
    elements.toggleButton.classList.remove("playing")
  }
}

/**
 * Toggles audio playback state
 */
async function toggleAudio() {
  if (!audioContext) {
    await initializeAudio()
  } else {
    await stopAudio()
  }
}

/**
 * Forces landscape orientation
 */
function forceLandscape() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape").catch((e) => {
      console.log("Orientation lock failed:", e)
    })
  }
}

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
  // XY Pad event listeners
  elements.xyPad.addEventListener("mousedown", handleXYPadInteraction, { passive: false })
  elements.xyPad.addEventListener("touchstart", handleXYPadInteraction, { passive: false })

  // Frequency Range event listeners
  elements.minFreqLine.addEventListener("mousedown", (e) => handleFreqRangeInteraction(e, true), { passive: false })
  elements.minFreqLine.addEventListener("touchstart", (e) => handleFreqRangeInteraction(e, true), { passive: false })
  elements.maxFreqLine.addEventListener("mousedown", (e) => handleFreqRangeInteraction(e, false), { passive: false })
  elements.maxFreqLine.addEventListener("touchstart", (e) => handleFreqRangeInteraction(e, false), { passive: false })

  // Document-level event listeners for drag operations
  document.addEventListener(
    "mousemove",
    (e) => {
      if (state.isDraggingXY) handleXYPadInteraction(e)
      if (state.isDraggingMinFreq) handleFreqRangeInteraction(e, true)
      if (state.isDraggingMaxFreq) handleFreqRangeInteraction(e, false)
    },
    { passive: false },
  )

  document.addEventListener(
    "touchmove",
    (e) => {
      // Handle each type of interaction separately
      if (state.isDraggingXY) handleXYPadInteraction(e)
      if (state.isDraggingMinFreq) handleFreqRangeInteraction(e, true)
      if (state.isDraggingMaxFreq) handleFreqRangeInteraction(e, false)
    },
    { passive: false },
  )

  document.addEventListener("mouseup", () => {
    state.isDraggingXY = false
    state.isDraggingMinFreq = false
    state.isDraggingMaxFreq = false
  })

  document.addEventListener("touchend", handleTouchEnd)
  document.addEventListener("touchcancel", handleTouchEnd)

  // Control Points slider
  elements.knumSlider.addEventListener("input", () => {
    const value = elements.knumSlider.value
    elements.knumValue.textContent = value
    updateAudioParameter("knum", Number.parseInt(value))
  })

  // Play/Stop button
  elements.toggleButton.addEventListener("click", toggleAudio)

  // Orientation change
  window.addEventListener("orientationchange", forceLandscape)
  window.addEventListener("resize", () => {
    updateXYPadDisplay()
    updateFrequencyDisplay()
  })
}

/**
 * Initializes the application
 */
function init() {
  forceLandscape()
  updateXYPadDisplay()
  updateFrequencyDisplay()
  setupEventListeners()
}

// Initialize the application when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", init)
