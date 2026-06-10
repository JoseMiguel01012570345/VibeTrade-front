import type { BrowserContext, Page } from "@playwright/test";

/** Stub getUserMedia + MediaRecorder so chat voice notes work in Playwright. */
export async function installChatVoiceRecorderMock(
  target: Page | BrowserContext,
): Promise<void> {
  const context = "context" in target ? target.context() : target;
  await context.addInitScript(() => {
    if ((window as unknown as { __vtVoiceMock?: boolean }).__vtVoiceMock) return;
    (window as unknown as { __vtVoiceMock?: boolean }).__vtVoiceMock = true;

    class FakeMediaStreamTrack {
      kind = "audio";
      enabled = true;
      id = "vt-fake-audio-track";
      label = "Fake Microphone";
      muted = false;
      readyState: MediaStreamTrackState = "live";
      stop() {
        this.readyState = "ended";
      }
      clone() {
        return new FakeMediaStreamTrack();
      }
      getCapabilities() {
        return {};
      }
      getConstraints() {
        return { audio: true };
      }
      getSettings() {
        return { deviceId: "fake", groupId: "fake" };
      }
      applyConstraints() {
        return Promise.resolve();
      }
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() {
        return true;
      }
    }

    const fakeStream = {
      id: "vt-fake-stream",
      active: true,
      getTracks: () => [new FakeMediaStreamTrack()],
      getAudioTracks: () => [new FakeMediaStreamTrack()],
      getVideoTracks: () => [] as MediaStreamTrack[],
      addTrack() {},
      removeTrack() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
    } as unknown as MediaStream;

    navigator.mediaDevices.getUserMedia = async () => fakeStream;

    class FakeAnalyserNode {
      fftSize = 32;
      frequencyBinCount = 16;
      getFloatTimeDomainData(arr: Float32Array) {
        arr.fill(0);
      }
    }

    class FakeMediaStreamSource {
      connect() {}
      disconnect() {}
    }

    class FakeAudioContext {
      state: AudioContextState = "running";
      createMediaStreamSource(_stream: MediaStream) {
        return new FakeMediaStreamSource();
      }
      createAnalyser() {
        return new FakeAnalyserNode();
      }
      close() {
        return Promise.resolve();
      }
    }

    window.AudioContext =
      FakeAudioContext as unknown as typeof AudioContext;
    (
      window as unknown as { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext = FakeAudioContext as unknown as typeof AudioContext;

    const OrigMR = window.MediaRecorder;
    class MockMediaRecorder {
      static isTypeSupported(type: string) {
        return (
          OrigMR?.isTypeSupported?.(type) ??
          /audio\/(webm|ogg|mp4)/.test(type)
        );
      }

      stream: MediaStream;
      mimeType: string;
      state: RecordingState = "inactive";
      ondataavailable: ((ev: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      onstart: (() => void) | null = null;

      constructor(stream: MediaStream, opts?: MediaRecorderOptions) {
        this.stream = stream;
        this.mimeType = opts?.mimeType ?? "audio/webm";
      }

      start(_timeslice?: number) {
        this.state = "recording";
        this.onstart?.();
      }

      stop() {
        if (this.state === "inactive") return;
        this.state = "inactive";
        const blob = new Blob([new Uint8Array(64).fill(0x1a)], {
          type: this.mimeType,
        });
        this.ondataavailable?.({ data: blob } as BlobEvent);
        this.onstop?.();
      }

      pause() {}
      resume() {}
      requestData() {}
      addEventListener(type: string, listener: EventListener) {
        if (type === "dataavailable")
          this.ondataavailable = listener as (ev: BlobEvent) => void;
        if (type === "stop") this.onstop = listener as () => void;
        if (type === "start") this.onstart = listener as () => void;
        if (type === "error") this.onerror = listener as (ev: Event) => void;
      }
      removeEventListener() {}
      dispatchEvent() {
        return true;
      }
    }

    window.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;
  });
}
