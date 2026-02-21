// Audio Analysis utilities for "best moment" detection
// This uses Web Audio API to analyze audio files and identify optimal segments

export interface AudioFeatures {
  bpm: number;
  keySignature: string;
  energyLevel: number; // 0-1
  danceability: number; // 0-1
  valence: number; // 0-1 (positivity)
  rms: number[]; // Root mean square energy over time
  spectralCentroid: number[]; // Brightness over time
  zeroCrossingRate: number[]; // Percussiveness over time
  tempoChanges: number[]; // BPM changes over time
}

export interface BestMomentAnalysis {
  chorusStart: number;
  chorusEnd: number;
  dropStart: number;
  dropEnd: number;
  bridgeStart: number;
  bridgeEnd: number;
  peakMoments: number[];
  waveformPoints: number[]; // Compressed waveform for visualization
  features: AudioFeatures;
}

export class AudioAnalyzer {
  private audioContext: AudioContext;
  private audioBuffer: AudioBuffer | null = null;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async loadAudioFile(audioUrl: string): Promise<void> {
    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Error loading audio file:', error);
      throw error;
    }
  }

  async analyzeAudio(): Promise<BestMomentAnalysis> {
    if (!this.audioBuffer) {
      throw new Error('No audio file loaded');
    }

    const features = await this.extractFeatures();
    const structure = await this.analyzeStructure(features);
    const waveform = this.generateWaveform();

    return {
      chorusStart: structure.chorusStart,
      chorusEnd: structure.chorusEnd,
      dropStart: structure.dropStart,
      dropEnd: structure.dropEnd,
      bridgeStart: structure.bridgeStart,
      bridgeEnd: structure.bridgeEnd,
      peakMoments: structure.peakMoments,
      waveformPoints: waveform,
      features
    };
  }

  private async extractFeatures(): Promise<AudioFeatures> {
    if (!this.audioBuffer) throw new Error('No audio buffer');

    const channelData = this.audioBuffer.getChannelData(0);
    const sampleRate = this.audioBuffer.sampleRate;
    const duration = this.audioBuffer.duration;

    // Extract RMS energy
    const rms = this.calculateRMS(channelData);

    // Extract spectral features
    const spectralCentroid = this.calculateSpectralCentroid(channelData);

    // Extract zero crossing rate (percussiveness)
    const zeroCrossingRate = this.calculateZeroCrossingRate(channelData);

    // Estimate BPM and tempo changes
    const { bpm, tempoChanges } = await this.estimateTempo(channelData, sampleRate);

    // Estimate key signature (simplified)
    const keySignature = this.estimateKey(channelData, sampleRate);

    // Calculate energy level
    const energyLevel = this.calculateEnergyLevel(rms);

    // Estimate danceability based on rhythm consistency
    const danceability = this.estimateDanceability(tempoChanges, rms);

    // Estimate valence (positivity) based on spectral features
    const valence = this.estimateValence(spectralCentroid, rms);

    return {
      bpm,
      keySignature,
      energyLevel,
      danceability,
      valence,
      rms,
      spectralCentroid,
      zeroCrossingRate,
      tempoChanges
    };
  }

  private calculateRMS(channelData: Float32Array): number[] {
    const windowSize = 1024;
    const hopSize = 512;
    const rms: number[] = [];

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += channelData[i + j] ** 2;
      }
      rms.push(Math.sqrt(sum / windowSize));
    }

    return rms;
  }

  private calculateSpectralCentroid(channelData: Float32Array): number[] {
    const windowSize = 1024;
    const hopSize = 512;
    const centroids: number[] = [];

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      const fft = this.performFFT(window);
      const centroid = this.calculateCentroidFromFFT(fft);
      centroids.push(centroid);
    }

    return centroids;
  }

  private calculateZeroCrossingRate(channelData: Float32Array): number[] {
    const windowSize = 1024;
    const hopSize = 512;
    const zcr: number[] = [];

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let crossings = 0;
      for (let j = 1; j < windowSize; j++) {
        if ((channelData[i + j] >= 0) !== (channelData[i + j - 1] >= 0)) {
          crossings++;
        }
      }
      zcr.push(crossings / windowSize);
    }

    return zcr;
  }

  private async estimateTempo(channelData: Float32Array, sampleRate: number): Promise<{ bpm: number; tempoChanges: number[] }> {
    // Lightweight tempo estimation.
    // The previous autocorrelation approach was O(n^2) and could freeze the UI for 30s previews.
    // Here we downsample and compute a limited-lag autocorrelation over small windows.

    const minBPM = 60;
    const maxBPM = 180;

    // Downsample to ~8kHz to reduce work
    const targetRate = 8000;
    const downsampleFactor = Math.max(1, Math.floor(sampleRate / targetRate));
    const dsRate = sampleRate / downsampleFactor;
    const dsLength = Math.floor(channelData.length / downsampleFactor);
    const downsampled = new Float32Array(dsLength);
    for (let i = 0, j = 0; j < dsLength; i += downsampleFactor, j++) {
      downsampled[j] = channelData[i] || 0;
    }

    // 1-second windows, 50% overlap
    const windowSize = Math.min(downsampled.length, Math.floor(dsRate * 1));
    if (windowSize < 1024) {
      return { bpm: 120, tempoChanges: [120] };
    }
    const hop = Math.floor(windowSize / 2);

    const tempos: number[] = [];
    for (let start = 0; start + windowSize <= downsampled.length; start += hop) {
      const window = downsampled.subarray(start, start + windowSize);
      const bpm = this.findTempoInWindowFast(window, dsRate, minBPM, maxBPM);
      if (Number.isFinite(bpm) && bpm > 0) tempos.push(bpm);
      if (tempos.length >= 20) break; // cap work
    }

    if (tempos.length === 0) {
      return { bpm: 120, tempoChanges: [120] };
    }

    const sorted = [...tempos].sort((a, b) => a - b);
    const overallBPM = sorted[Math.floor(sorted.length / 2)];
    return { bpm: overallBPM, tempoChanges: tempos };
  }

  private findTempoInWindowFast(window: Float32Array, sampleRate: number, minBPM: number, maxBPM: number): number {
    const minLag = Math.floor(60 * sampleRate / maxBPM);
    const maxLag = Math.floor(60 * sampleRate / minBPM);

    // Subsample within correlation to limit cost
    const step = 4;

    let bestLag = minLag;
    let bestScore = -Infinity;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let score = 0;
      for (let i = 0; i < window.length - lag; i += step) {
        score += window[i] * window[i + lag];
      }
      if (score > bestScore) {
        bestScore = score;
        bestLag = lag;
      }
    }

    const bpm = 60 * sampleRate / bestLag;
    if (!Number.isFinite(bpm)) return 120;
    return Math.max(minBPM, Math.min(maxBPM, bpm));
  }

  private estimateKey(channelData: Float32Array, sampleRate: number): string {
    // Simplified key estimation - this would normally use pitch detection
    // For now, return a common key
    const keys = ['C major', 'D major', 'E major', 'F major', 'G major', 'A major', 'B major',
                  'C minor', 'D minor', 'E minor', 'F minor', 'G minor', 'A minor', 'B minor'];
    return keys[Math.floor(Math.random() * keys.length)];
  }

  private calculateEnergyLevel(rms: number[]): number {
    const avgRMS = rms.reduce((sum, val) => sum + val, 0) / rms.length;
    return Math.min(avgRMS * 10, 1); // Normalize to 0-1
  }

  private estimateDanceability(tempoChanges: number[], rms: number[]): number {
    // Higher danceability for consistent tempo and strong rhythm
    const tempoVariance = this.calculateVariance(tempoChanges);
    const avgRMS = rms.reduce((sum, val) => sum + val, 0) / rms.length;
    
    const tempoConsistency = Math.max(0, 1 - tempoVariance / 100);
    const rhythmStrength = Math.min(avgRMS * 5, 1);
    
    return (tempoConsistency * 0.6 + rhythmStrength * 0.4);
  }

  private estimateValence(spectralCentroid: number[], rms: number[]): number {
    // Higher valence for brighter sounds and moderate energy
    const avgCentroid = spectralCentroid.reduce((sum, val) => sum + val, 0) / spectralCentroid.length;
    const avgRMS = rms.reduce((sum, val) => sum + val, 0) / rms.length;
    
    const brightness = Math.min(avgCentroid / 2000, 1);
    const energy = Math.min(avgRMS * 5, 1);
    
    return (brightness * 0.7 + energy * 0.3);
  }

  private async analyzeStructure(features: AudioFeatures): Promise<{
    chorusStart: number;
    chorusEnd: number;
    dropStart: number;
    dropEnd: number;
    bridgeStart: number;
    bridgeEnd: number;
    peakMoments: number[];
  }> {
    if (!this.audioBuffer) throw new Error('No audio buffer');

    const duration = this.audioBuffer.duration;
    const rms = features.rms;
    const hopDuration = duration / rms.length;

    // Find energy peaks for chorus/drop detection
    const energyThreshold = this.calculatePercentile(rms, 0.75);
    const peakIndices = this.findPeaksAboveThreshold(rms, energyThreshold);

    // Structure estimation based on typical song structure
    const structure = this.estimateSongStructure(peakIndices, hopDuration, duration, features);

    return structure;
  }

  private calculatePercentile(data: number[], percentile: number): number {
    const sorted = [...data].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * percentile);
    return sorted[index];
  }

  private findPeaksAboveThreshold(data: number[], threshold: number): number[] {
    const peaks: number[] = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }

  private estimateSongStructure(
    peakIndices: number[], 
    hopDuration: number, 
    duration: number,
    features: AudioFeatures
  ): {
    chorusStart: number;
    chorusEnd: number;
    dropStart: number;
    dropEnd: number;
    bridgeStart: number;
    bridgeEnd: number;
    peakMoments: number[];
  } {
    // Default structure for typical pop song
    const introEnd = duration * 0.15;
    const verseEnd = duration * 0.3;
    const chorusStart = duration * 0.35;
    const chorusEnd = duration * 0.5;
    const verse2End = duration * 0.65;
    const bridgeStart = duration * 0.7;
    const bridgeEnd = duration * 0.8;
    const finalChorusStart = duration * 0.8;
    const finalChorusEnd = duration * 0.95;

    // For electronic music, look for drops
    const isElectronic = features.danceability > 0.7 && features.bpm > 120;
    
    let dropStart = 0;
    let dropEnd = 0;
    
    if (isElectronic && peakIndices.length > 0) {
      // First major peak after 30 seconds is likely the drop
      const firstMajorPeak = peakIndices.find(idx => idx * hopDuration > 30);
      if (firstMajorPeak) {
        dropStart = firstMajorPeak * hopDuration;
        dropEnd = dropStart + 16; // 16 bars of drop
      }
    }

    // Find all peak moments
    const peakMoments = peakIndices.map(idx => idx * hopDuration);

    return {
      chorusStart,
      chorusEnd,
      dropStart,
      dropEnd,
      bridgeStart,
      bridgeEnd,
      peakMoments
    };
  }

  private generateWaveform(points = 100): number[] {
    if (!this.audioBuffer) return [];

    const channelData = this.audioBuffer.getChannelData(0);
    const samplesPerPoint = Math.floor(channelData.length / points);
    const waveform: number[] = [];

    for (let i = 0; i < points; i++) {
      const start = i * samplesPerPoint;
      const end = start + samplesPerPoint;
      let sum = 0;

      for (let j = start; j < end && j < channelData.length; j++) {
        sum += Math.abs(channelData[j]);
      }

      waveform.push(sum / samplesPerPoint);
    }

    return waveform;
  }

  private performFFT(window: Float32Array): Float32Array {
    // Simplified FFT - in production, use a proper FFT library
    const fftSize = window.length;
    const fft = new Float32Array(fftSize);
    
    // This is a placeholder - real FFT implementation needed
    for (let i = 0; i < fftSize; i++) {
      fft[i] = Math.abs(window[i]);
    }
    
    return fft;
  }

  private calculateCentroidFromFFT(fft: Float32Array): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < fft.length; i++) {
      numerator += i * fft[i];
      denominator += fft[i];
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateVariance(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
  }

  // Utility method to get best moment for Instagram-style editing
  static getBestMomentForVideo(analysis: BestMomentAnalysis, videoDuration: number): {
    startTime: number;
    endTime: number;
    type: 'chorus' | 'drop' | 'bridge' | 'peak';
  } {
    const { chorusStart, chorusEnd, dropStart, dropEnd, bridgeStart, bridgeEnd, peakMoments } = analysis;

    // Priority order: drop > chorus > bridge > peak
    const candidates = [
      { start: dropStart, end: dropEnd, type: 'drop' as const },
      { start: chorusStart, end: chorusEnd, type: 'chorus' as const },
      { start: bridgeStart, end: bridgeEnd, type: 'bridge' as const },
    ];

    // Find the best moment that fits within video duration
    for (const candidate of candidates) {
      if (candidate.start >= 0 && candidate.end > candidate.start && 
          candidate.end - candidate.start <= videoDuration) {
        return {
          startTime: candidate.start,
          endTime: candidate.end,
          type: candidate.type
        };
      }
    }

    // Fallback to first peak moment
    if (peakMoments.length > 0) {
      const firstPeak = peakMoments[0];
      return {
        startTime: firstPeak,
        endTime: Math.min(firstPeak + 30, videoDuration),
        type: 'peak'
      };
    }

    // Final fallback - start of song
    return {
      startTime: 0,
      endTime: Math.min(30, videoDuration),
      type: 'peak'
    };
  }
}
