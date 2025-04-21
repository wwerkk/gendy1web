let gendy1Node = null;
let audioContext = null;

const toggleButton = document.getElementById('toggleButton');
const icon = toggleButton.querySelector(".material-icons");
const sliders = document.querySelectorAll('input[type="range"]');

// Listeners
document.addEventListener('DOMContentLoaded', function () {
  sliders.forEach(slider => {
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
  } catch (error) {
    console.error('Error initializing:', error);
    alert('Failed to initialize audio. See console for details.');
  }
}