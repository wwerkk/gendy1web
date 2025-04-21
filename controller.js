let audioContext = null
let gendy1Node = null

// DOM Elements
const elements = {
  // Main controls
  toggleButton: document.getElementById("toggleButton"),
  playIcon: document.querySelector("#toggleButton .material-icons"),
  knumSlider: document.getElementById("knum"),
  knumValue: document.getElementById("knum-value"),

  // Frequency Range
  freqRange: document.getElementById("freq-range"),
  minFreqLine: document.getElementById("min-freq-line"),
  maxFreqLine: document.getElementById("max-freq-line"),
  minFreqValue: document.getElementById("minfreq-value"),
  maxFreqValue: document.getElementById("maxfreq-value"),

  // XY Pad
  xyPad: document.getElementById("scaling-pad"),
  xyHandle: document.getElementById("scaling-handle"),
  ampscaleValue: document.getElementById("ampscale-value"),
  durscaleValue: document.getElementById("durscale-value"),
}

// Parameter state
const state = {
  // Frequency Range
  isDraggingMin: false,
  isDraggingMax: false,
  minFreq: 20,
  maxFreq: 800,

  // Constants
  MIN_FREQ_LIMIT: 1,
  MAX_FREQ_LIMIT: 5000,

  // XY Pad
  isDragging: false,
  ampscale: 0.5,
  durscale: 0.5,
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
  const rangeHeight = elements.freqRange.clientHeight

  // Calculate positions (top=high, bottom=low)
  const minPos = (1 - state.minFreq / state.MAX_FREQ_LIMIT) * rangeHeight
  const maxPos = (1 - state.maxFreq / state.MAX_FREQ_LIMIT) * rangeHeight

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
 * Handles Frequency Range interaction events (mouse/touch)
 * @param {Event} event - The interaction event
 * @param {boolean} isMinLine - Whether the interaction is with the min frequency line
 */
function handleFreqRangeInteraction(event, isMinLine) {
  if (!state.isDraggingMin && !state.isDraggingMax && event.type !== "mousedown" && event.type !== "touchstart") return

  if ((isMinLine && !state.isDraggingMin) || (!isMinLine && !state.isDraggingMax)) return

  event.preventDefault()

  const rangeRect = elements.freqRange.getBoundingClientRect()
  let clientY

  // Handle both mouse and touch events
  if (event.type.startsWith("touch")) {
    const touch = event.touches[0] || event.changedTouches[0]
    clientY = touch.clientY
  } else {
    clientY = event.clientY
  }

  // Calculate position relative to container
  const relativeY = clientY - rangeRect.top
  const normalizedY = 1 - relativeY / rangeRect.height // Invert for natural mapping

  // Calculate frequency value
  const freq = Math.round(normalizedY * state.MAX_FREQ_LIMIT)

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
 * Handles XY Pad interaction events (mouse/touch)
 * @param {Event} event - The interaction event
 */
function handleXYPadInteraction(event) {
  if (!state.isDragging && event.type !== "mousedown" && event.type !== "touchstart") return

  event.preventDefault()

  const padRect = elements.xyPad.getBoundingClientRect()
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
  state.durscale = Math.max(0, Math.min(1, (clientX - padRect.left) / padRect.width))
  state.ampscale = Math.max(0, Math.min(1, 1 - (clientY - padRect.top) / padRect.height)) // Invert Y

  updateXYPadDisplay()
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
 * Sets up all event listeners
 */
function setupEventListeners() {

  // Frequency Range event listeners
  elements.minFreqLine.addEventListener("mousedown", (e) => {
    state.isDraggingMin = true
    handleFreqRangeInteraction(e, true)
  })

  elements.minFreqLine.addEventListener("touchstart", (e) => {
    state.isDraggingMin = true
    handleFreqRangeInteraction(e, true)
  })

  elements.maxFreqLine.addEventListener("mousedown", (e) => {
    state.isDraggingMax = true
    handleFreqRangeInteraction(e, false)
  })

  elements.maxFreqLine.addEventListener("touchstart", (e) => {
    state.isDraggingMax = true
    handleFreqRangeInteraction(e, false)
  })

  // XY Pad event listeners
  elements.xyPad.addEventListener("mousedown", (e) => {
    state.isDragging = true
    handleXYPadInteraction(e)
  })

  elements.xyPad.addEventListener("touchstart", (e) => {
    state.isDragging = true
    handleXYPadInteraction(e)
  })

  // Document-level event listeners for drag operations
  document.addEventListener("mousemove", (e) => {
    if (state.isDragging) handleXYPadInteraction(e)
    if (state.isDraggingMin) handleFreqRangeInteraction(e, true)
    if (state.isDraggingMax) handleFreqRangeInteraction(e, false)
  })

  document.addEventListener("touchmove", (e) => {
    if (state.isDragging) handleXYPadInteraction(e)
    if (state.isDraggingMin) handleFreqRangeInteraction(e, true)
    if (state.isDraggingMax) handleFreqRangeInteraction(e, false)
  })

  document.addEventListener("mouseup", () => {
    state.isDragging = false
    state.isDraggingMin = false
    state.isDraggingMax = false
  })

  document.addEventListener("touchend", () => {
    state.isDragging = false
    state.isDraggingMin = false
    state.isDraggingMax = false
  })

  // Control Points slider
  elements.knumSlider.addEventListener("input", () => {
    const value = elements.knumSlider.value
    elements.knumValue.textContent = value
    updateAudioParameter("knum", Number.parseInt(value))
  })

  // Play/Stop button
  elements.toggleButton.addEventListener("click", toggleAudio)
}

/**
 * Initializes the application
 */
function init() {
  updateFrequencyDisplay()
  updateXYPadDisplay()
  setupEventListeners()
}

// Initialize the application when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", init)
