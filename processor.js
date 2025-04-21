// An implementation of Xenakis' GENDYN algorithm
// based on Nick Collins' SuperCollider Gendy1 UGen

class Gendy1Processor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        { name: 'ampDist', defaultValue: 1, minValue: 0, maxValue: 6, automationRate: 'k-rate' },
        { name: 'durDist', defaultValue: 1, minValue: 0, maxValue: 6, automationRate: 'k-rate' },
        { name: 'adparam', defaultValue: 0.9, minValue: 0.0001, maxValue: 1.0, automationRate: 'k-rate' },
        { name: 'ddparam', defaultValue: 0.9, minValue: 0.0001, maxValue: 1.0, automationRate: 'k-rate' },
        { name: 'minfreq', defaultValue: 20, minValue: 1, maxValue: 20000, automationRate: 'k-rate' },
        { name: 'maxfreq', defaultValue: 1000, minValue: 1, maxValue: 20000, automationRate: 'k-rate' },
        { name: 'ampscale', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
        { name: 'durscale', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
        { name: 'knum', defaultValue: 12, minValue: 1, maxValue: 32, automationRate: 'k-rate' }
      ];
    }
  
    constructor() {
      super();
      this.phase = 1.0;
      this.amp = 0.0;
      this.nextAmp = 0.0;
      this.speed = 100.0;
      this.dur = 0.0;
      
      this.sampleRate = 44100; // Default, will be updated in process()
      this.freqMul = 1.0 / this.sampleRate;
      
      this.memorySize = 32;  // Default memory size
      this.index = 0;
      
      this.memoryAmp = [];
      this.memoryDur = [];
  
      // Initialize memory with random values
      for (let i = 0; i < this.memorySize; i++) {
        this.memoryAmp[i] = 2 * Math.random() - 1.0;
        this.memoryDur[i] = Math.random();
      }
    }
  
    // Implementation of the different distributions
    gendynDistribution(which, a, f) {
      // Clamp 'a' parameter to valid range
      if (a > 1.0) a = 1.0;
      if (a < 0.0001) a = 0.0001;
  
      let temp, c;
      const pi = Math.PI;
  
      switch (which) {
        case 0: // LINEAR
          return 2.0 * f - 1.0;
  
        case 1: // CAUCHY
          c = Math.atan(10 * a);
          temp = (1.0 / a) * Math.tan(c * (2.0 * f - 1.0));
          return temp * 0.1;
  
        case 2: // LOGISTIC
          c = 0.5 + (0.499 * a);
          c = Math.log((1.0 - c) / c);
          
          f = ((f - 0.5) * 0.998 * a) + 0.5;
          temp = Math.log((1.0 - f) / f) / c;
          return temp;
  
        case 3: // HYPERBCOS
          c = Math.tan(1.5692255 * a);
          temp = Math.tan(1.5692255 * a * f) / c;
          temp = Math.log(temp * 0.999 + 0.001) * (-0.1447648);
          return 2.0 * temp - 1.0;
  
        case 4: // ARCSINE
          c = Math.sin(1.5707963 * a);
          temp = Math.sin(pi * (f - 0.5) * a) / c;
          return temp;
  
        case 5: // EXPON
          c = Math.log(1.0 - (0.999 * a));
          temp = Math.log(1.0 - (f * 0.999 * a)) / c;
          return 2.0 * temp - 1.0;
  
        case 6: // SINUS
          return 2.0 * a - 1.0;
  
        default:
          return 2.0 * f - 1.0;
      }
    }
  
    // Main process method
    process(inputs, outputs, parameters) {
      const output = outputs[0][0];
      if (!output) return true; // Skip processing if no output buffer
      
      // Get parameters
      const whichamp = Math.floor(parameters.ampDist[0]);
      const whichdur = Math.floor(parameters.durDist[0]);
      const aamp = parameters.adparam[0];
      const adur = parameters.ddparam[0];
      const minfreq = parameters.minfreq[0];
      const maxfreq = parameters.maxfreq[0];
      const scaleamp = parameters.ampscale[0];
      const scaledur = parameters.durscale[0];
      const num = Math.floor(parameters.knum[0]);
      
      // Update sample rate and frequency multiplier if needed
      if (this.sampleRate !== sampleRate) {
        this.sampleRate = sampleRate;
        this.freqMul = 1.0 / this.sampleRate;
      }
      
      // Ensure num is valid and not greater than memory size
      const actualNum = (num > this.memorySize || num < 1) ? this.memorySize : num;
      
      // Process each sample
      for (let i = 0; i < output.length; i++) {
        // Check if it's time to calculate new values
        if (this.phase >= 1.0) {
          this.phase -= 1.0;
          
          this.index = (this.index + 1) % actualNum;
          this.amp = this.nextAmp;
          
          // Calculate new amplitude
          this.nextAmp = this.memoryAmp[this.index] + (scaleamp * this.gendynDistribution(whichamp, aamp, Math.random()));
          
          // Mirroring for bounds - safe version
          if (this.nextAmp > 1.0 || this.nextAmp < -1.0) {
            if (this.nextAmp < 0.0) {
              this.nextAmp = this.nextAmp + 4.0;
            }
            
            this.nextAmp = this.nextAmp % 4.0;
            
            if (this.nextAmp > 1.0 && this.nextAmp < 3.0) {
              this.nextAmp = 2.0 - this.nextAmp;
            } else if (this.nextAmp > 1.0) {
              this.nextAmp = this.nextAmp - 4.0;
            }
          }
          
          this.memoryAmp[this.index] = this.nextAmp;
          
          // Calculate new duration
          this.dur = this.memoryDur[this.index] + (scaledur * this.gendynDistribution(whichdur, adur, Math.random()));
          
          if (this.dur > 1.0 || this.dur < 0.0) {
            if (this.dur < 0.0) {
              this.dur = this.dur + 2.0;
            }
            this.dur = this.dur % 2.0;
            this.dur = 2.0 - this.dur;
          }
          
          this.memoryDur[this.index] = this.dur;
          
          // Define range of speeds
          this.speed = (minfreq + ((maxfreq - minfreq) * this.dur)) * this.freqMul;
          this.speed *= actualNum;
        }
        
        const z = ((1.0 - this.phase) * this.amp) + (this.phase * this.nextAmp);
        output[i] = Math.max(-1, Math.min(1, z)); // brute clip for safety
        
        this.phase += this.speed;
      }
      
      return true;
    }
  }
  
  registerProcessor('gendy1-processor', Gendy1Processor);