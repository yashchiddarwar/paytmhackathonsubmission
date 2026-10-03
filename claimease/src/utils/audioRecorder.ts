/**
 * Audio Recording and Speech Dictation Utility
 * Combines Web Speech API (real-time streaming speech-to-text)
 * with MediaRecorder fallback and Gemini AI audio transcription (/api/ai/transcribe-audio).
 */

export interface AudioRecorderState {
  isRecording: boolean;
  isTranscribing: boolean;
  durationSeconds: number;
  liveText: string;
  error: string | null;
}

export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private timerInterval: any = null;
  private speechRecognition: any = null;
  private currentTranscript: string = '';
  private isSpeechActive: boolean = false;

  public getTranscript(): string {
    return this.currentTranscript;
  }

  public async startRecording(
    onTick: (seconds: number) => void,
    onLiveSpeech?: (text: string) => void
  ): Promise<{ usingWebSpeech: boolean; usingMediaRecorder: boolean }> {
    this.audioChunks = [];
    this.currentTranscript = '';
    let webSpeechStarted = false;
    let mediaRecorderStarted = false;

    // 1. Try Web Speech API first (provides zero-latency streaming text)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = navigator.language || 'en-IN';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          const combined = (this.currentTranscript + ' ' + finalTranscript + interimTranscript).trim();
          if (finalTranscript) {
            this.currentTranscript = (this.currentTranscript + ' ' + finalTranscript).trim();
          }

          if (combined && onLiveSpeech) {
            onLiveSpeech(combined);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('SpeechRecognition event error:', e?.error);
        };

        recognition.onend = () => {
          if (this.isSpeechActive && this.speechRecognition) {
            try {
              recognition.start();
            } catch (_) {}
          }
        };

        recognition.start();
        this.speechRecognition = recognition;
        this.isSpeechActive = true;
        webSpeechStarted = true;
      } catch (speechErr) {
        console.warn('Web Speech API could not initialize:', speechErr);
      }
    }

    // 2. Try getUserMedia for MediaRecorder (records high-fidelity audio for Gemini)
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        let mimeType = 'audio/webm';
        if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
          } else {
            mimeType = '';
          }

          this.mediaRecorder = mimeType
            ? new MediaRecorder(this.stream, { mimeType })
            : new MediaRecorder(this.stream);

          this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              this.audioChunks.push(event.data);
            }
          };

          this.mediaRecorder.start(250);
          mediaRecorderStarted = true;
        }
      } catch (mediaErr: any) {
        console.warn('getUserMedia error:', mediaErr);
        // If Web Speech already started, don't throw! Web Speech will provide dictation.
        if (!webSpeechStarted) {
          const isPermissionDenied =
            mediaErr.name === 'NotAllowedError' ||
            mediaErr.name === 'PermissionDeniedError' ||
            mediaErr.message?.includes('denied');

          const isNotFound =
            mediaErr.name === 'NotFoundError' ||
            mediaErr.name === 'DevicesNotFoundError';

          if (isPermissionDenied) {
            throw new Error('MIC_PERMISSION_DENIED');
          } else if (isNotFound) {
            throw new Error('NO_MIC_DEVICE');
          } else {
            throw new Error(mediaErr.message || 'MIC_UNAVAILABLE');
          }
        }
      }
    } else if (!webSpeechStarted) {
      throw new Error('MIC_UNSUPPORTED_CONTEXT');
    }

    // Start timer
    let elapsed = 0;
    onTick(0);
    this.timerInterval = setInterval(() => {
      elapsed += 1;
      onTick(elapsed);
    }, 1000);

    return {
      usingWebSpeech: webSpeechStarted,
      usingMediaRecorder: mediaRecorderStarted
    };
  }

  public async stopAndTranscribe(): Promise<string> {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.isSpeechActive = false;
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (_) {}
      this.speechRecognition = null;
    }

    // If we have live Web Speech transcript, prioritize it for immediate responsiveness
    const accumulatedText = this.currentTranscript.trim();

    return new Promise((resolve) => {
      // If we don't have a mediaRecorder or no chunks recorded
      if (!this.mediaRecorder || this.audioChunks.length === 0) {
        this.cleanup();
        return resolve(accumulatedText);
      }

      const recorder = this.mediaRecorder;
      const chunks = [...this.audioChunks];
      const mimeType = recorder.mimeType || 'audio/webm';

      // Set timeout in case onstop hangs
      const fallbackTimer = setTimeout(() => {
        this.cleanup();
        resolve(accumulatedText);
      }, 4000);

      recorder.onstop = async () => {
        clearTimeout(fallbackTimer);
        try {
          const audioBlob = new Blob(chunks, { type: mimeType });
          this.cleanup();

          // If blob is very small or if we already have a detailed web speech transcript
          if (audioBlob.size < 600 && accumulatedText) {
            return resolve(accumulatedText);
          }

          // Try Gemini audio transcription endpoint
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result as string;
              const res = await fetch('/api/ai/transcribe-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: base64Audio, mimeType })
              });

              if (res.ok) {
                const data = await res.json();
                if (data.text && data.text.trim()) {
                  return resolve(data.text.trim());
                }
              }
              // If Gemini transcription was empty, fall back to accumulated speech text
              resolve(accumulatedText);
            } catch (postErr) {
              console.warn('Backend audio transcription error, using Web Speech text:', postErr);
              resolve(accumulatedText);
            }
          };
          reader.onerror = () => resolve(accumulatedText);
        } catch (stopErr) {
          console.warn('Recorder stop error:', stopErr);
          this.cleanup();
          resolve(accumulatedText);
        }
      };

      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          clearTimeout(fallbackTimer);
          this.cleanup();
          resolve(accumulatedText);
        }
      } catch (err) {
        clearTimeout(fallbackTimer);
        this.cleanup();
        resolve(accumulatedText);
      }
    });
  }

  public cancel(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isSpeechActive = false;
    if (this.speechRecognition) {
      try { this.speechRecognition.stop(); } catch (_) {}
      this.speechRecognition = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (_) {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      this.stream = null;
    }
    this.audioChunks = [];
    this.mediaRecorder = null;
  }
}
