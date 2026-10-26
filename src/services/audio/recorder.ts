export interface AudioRecordingResult {
  blob: Blob;
  base64: string;
  transcript: string;
  durationSeconds: number;
}

export type VolumeCallback = (volumePercent: number) => void;
export type TranscriptCallback = (interimTranscript: string) => void;

export class ProductionAudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private recognition: any = null;
  private fullTranscript: string = '';
  private startTime: number = 0;

  /**
   * Check if audio capture is supported in this environment
   */
  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Start microphone recording with real-time volume analysis and speech recognition
   */
  async start(
    onVolume?: VolumeCallback,
    onTranscript?: TranscriptCallback
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Mikrofon tidak didukung pada browser/sistem ini.');
    }

    this.audioChunks = [];
    this.fullTranscript = '';
    this.startTime = Date.now();

    // 1. Request microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // 2. Setup MediaRecorder
    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
    }

    this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    this.mediaRecorder.start(100); // 100ms chunk slices

    // 3. Setup AudioContext Analyser for live volume metering
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const volumePercent = Math.min(100, Math.round((average / 128) * 100));
          if (onVolume) onVolume(volumePercent);
          this.animFrameId = requestAnimationFrame(checkVolume);
        };
        this.animFrameId = requestAnimationFrame(checkVolume);
      }
    } catch (e) {
      console.warn('AudioContext Analyser not available:', e);
    }

    // 4. Setup SpeechRecognition (Native browser / Webview Speech API)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'id-ID'; // Default to Indonesian, also handles mixed terms

        this.recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              this.fullTranscript += transcript + ' ';
            } else {
              interim += transcript;
            }
          }
          if (onTranscript) {
            onTranscript(this.fullTranscript + interim);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
        };

        this.recognition.start();
      } catch (e) {
        console.warn('Could not start SpeechRecognition:', e);
      }
    }
  }

  /**
   * Stop recording and return audio blob, base64, and transcript
   */
  async stop(): Promise<AudioRecordingResult> {
    const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

    // Cancel volume loop
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Stop SpeechRecognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    // Close AudioContext
    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {}
      this.audioContext = null;
      this.analyser = null;
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('MediaRecorder tidak aktif.'));
      }

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        // Stop all audio tracks to release microphone hardware
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop());
          this.mediaStream = null;
        }

        // Convert blob to Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string) || '';
          resolve({
            blob: audioBlob,
            base64,
            transcript: this.fullTranscript.trim(),
            durationSeconds,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}

export const productionAudioRecorder = new ProductionAudioRecorder();
