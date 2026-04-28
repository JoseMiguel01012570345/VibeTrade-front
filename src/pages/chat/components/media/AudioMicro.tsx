import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "../../../../lib/cn";
import {
  fetchMediaObjectUrl,
  getCachedMediaObjectUrl,
  isProtectedMediaUrl,
} from "../../../../utils/media/mediaClient";
import {
  claimChatVoicePlayback,
  releaseChatVoicePlayback,
} from "../../lib/voicePlaybackCoordinator";
import { finiteDuration, formatTime } from "./audioHelpers";
import {
  computeWaveformPeaksFromUrl,
  uniformWaveformPeaks,
} from "./waveformPeaks";
import {
  type VoiceMicroPalette,
  readAudioMicroPalette,
} from "../../lib/voiceUiColors";

const WAVE_BARS = 76;

export function AudioMicro({
  url,
  seconds,
  isMine = false,
}: {
  url: string;
  seconds: number;
  /** Nota propia (mismo tema que mensajes enviados). */
  isMine?: boolean;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const waveWrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const dragRef = useRef(false);
  const peaksRef = useRef<number[]>(uniformWaveformPeaks(WAVE_BARS));
  const decodeGenRef = useRef(0);
  const paletteRef = useRef<VoiceMicroPalette>(readAudioMicroPalette(isMine));

  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(() => finiteDuration(seconds, seconds));
  /** `/api/v1/media/…` necesita Bearer: mismo patrón que imágenes (fetch → blob URL). */
  const [playbackSrc, setPlaybackSrc] = useState(() => {
    if (!url) return "";
    if (!isProtectedMediaUrl(url)) return url;
    return getCachedMediaObjectUrl(url) ?? "";
  });

  useLayoutEffect(() => {
    paletteRef.current = readAudioMicroPalette(isMine);
  }, [isMine]);

  const drawWaveform = useCallback((peaks: number[], progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2 = canvas.getContext("2d");
    if (!ctx2) return;
    const pal = paletteRef.current;
    const w = canvas.width;
    const h = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    ctx2.clearRect(0, 0, w, h);

    const padX = 4 * dpr;
    const padY = 5 * dpr;
    const midY = h * 0.5;
    const waveW = Math.max(1, w - padX * 2);
    const n = peaks.length;
    const barGap = Math.max(0.35 * dpr, 0.28 * dpr);
    const totalGap = barGap * Math.max(0, n - 1);
    const barW = Math.max(0.38 * dpr, (waveW - totalGap) / n);

    const maxHalf = Math.max(1.8 * dpr, midY - padY - 1.5 * dpr);

    for (let i = 0; i < n; i++) {
      const norm = Math.min(1, Math.max(0.05, peaks[i] ?? 0.08));
      const halfH = Math.max(1 * dpr, norm * maxHalf);
      const x = padX + i * (barW + barGap);
      const barCenter = (i + 0.5) / n;
      const played = barCenter <= progress + 0.001;
      ctx2.fillStyle = played ? pal.played : pal.unplayed;
      const r = Math.min(barW * 0.42, 1 * dpr);
      const bx = x;
      const by = midY - halfH;
      const bw = barW;
      const bh = halfH * 2;
      if (typeof ctx2.roundRect === "function") {
        ctx2.beginPath();
        ctx2.roundRect(bx, by, bw, bh, r);
        ctx2.fill();
      } else {
        ctx2.fillRect(bx, by, bw, bh);
      }
    }

    const playX = padX + progress * Math.max(0.01, waveW);
    const thumbR = 4.75 * dpr;
    ctx2.beginPath();
    ctx2.arc(playX, midY, thumbR, 0, Math.PI * 2);
    ctx2.fillStyle = pal.thumb;
    ctx2.fill();
    ctx2.strokeStyle = pal.thumbStroke;
    ctx2.lineWidth = 1.2 * dpr;
    ctx2.stroke();
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const loop = useCallback(() => {
    const a = ref.current;
    const totalDur = finiteDuration(a?.duration ?? Number.NaN, seconds);
    const progress =
      totalDur > 0 && a
        ? Math.min(1, Math.max(0, a.currentTime / totalDur))
        : 0;
    const peaks = peaksRef.current;
    const safe =
      peaks.length === WAVE_BARS ? peaks : uniformWaveformPeaks(WAVE_BARS);

    drawWaveform(safe, progress);
    rafRef.current = requestAnimationFrame(loop);
  }, [drawWaveform, seconds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      const cw = Math.max(1, Math.floor(rect.width * dpr));
      const ch = Math.max(1, Math.floor(48 * dpr));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      ro.disconnect();
      stopRaf();
    };
  }, [loop, stopRaf]);

  useEffect(() => {
    return () => {
      stopRaf();
    };
  }, [stopRaf]);

  const toggle = useCallback(() => {
    const a = ref.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      claimChatVoicePlayback(a);
      void a.play().catch(() => {
        releaseChatVoicePlayback(a);
        setPlaying(false);
      });
    }
  }, [playing]);

  useEffect(() => {
    setCur(0);
    setDur(finiteDuration(seconds, seconds));
  }, [url, seconds]);

  useEffect(() => {
    if (!url) {
      setPlaybackSrc("");
      return;
    }
    if (!isProtectedMediaUrl(url)) {
      setPlaybackSrc(url);
      return;
    }
    const cached = getCachedMediaObjectUrl(url);
    if (cached) {
      setPlaybackSrc(cached);
      return;
    }
    setPlaybackSrc("");
    let cancelled = false;
    void fetchMediaObjectUrl(url).then((u) => {
      if (!cancelled) setPlaybackSrc(u);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    peaksRef.current = uniformWaveformPeaks(WAVE_BARS);
    const gen = ++decodeGenRef.current;
    let cancelled = false;
    void computeWaveformPeaksFromUrl(url, WAVE_BARS).then((p) => {
      if (cancelled || decodeGenRef.current !== gen) return;
      peaksRef.current =
        p.length === WAVE_BARS ? p : uniformWaveformPeaks(WAVE_BARS);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.muted = false;
    a.volume = 1;
    a.pause();
    a.currentTime = 0;
    setPlaying(false);
    a.load();
  }, [playbackSrc]);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => {
      if (!dragRef.current) {
        const t = a.currentTime;
        setCur(Number.isFinite(t) && t >= 0 ? t : 0);
      }
    };
    const onMeta = () => setDur(finiteDuration(a.duration, seconds));
    const onDurChange = () => setDur(finiteDuration(a.duration, seconds));
    const onEnd = () => {
      releaseChatVoicePlayback(a);
      setPlaying(false);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      releaseChatVoicePlayback(a);
      setPlaying(false);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onDurChange);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      releaseChatVoicePlayback(a);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onDurChange);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [seconds, playbackSrc]);

  const total = finiteDuration(dur, seconds);
  const pct = total > 0 ? Math.min(100, (cur / total) * 100) : 0;

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const wrap = waveWrapRef.current;
      const a = ref.current;
      if (!wrap || !a || total <= 0) return;
      const rect = wrap.getBoundingClientRect();
      const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
      const ratio = rect.width > 0 ? x / rect.width : 0;
      a.currentTime = ratio * total;
      setCur(a.currentTime);
    },
    [total],
  );

  const handleSeekKeys = useCallback(
    (e: ReactKeyboardEvent) => {
      const a = ref.current;
      if (!a || total <= 0) return;
      const step = Math.max(1, total * 0.05);
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        a.currentTime = Math.max(0, a.currentTime - step);
        setCur(a.currentTime);
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        a.currentTime = Math.min(total, a.currentTime + step);
        setCur(a.currentTime);
      }
    },
    [total],
  );

  const onWavePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      /** `preventDefault` blocks the default focus on click; keep slider focused for arrow-key seek. */
      e.currentTarget.focus({ preventScroll: true });
      dragRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekFromClientX(e.clientX);
    },
    [seekFromClientX],
  );

  const onWavePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      seekFromClientX(e.clientX);
    },
    [seekFromClientX],
  );

  const onWavePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (dragRef.current) {
        dragRef.current = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
      }
    },
    [],
  );

  return (
    <div
      className="flex min-h-[4.5rem] w-full min-w-0 max-w-full flex-col gap-0.5 [contain:layout]"
      data-chat-interactive
    >
      <div
        className={cn(
          "flex min-h-[3.25rem] min-w-0 items-center gap-2.5",
          isMine && "gap-3",
        )}
      >
        <audio
          ref={ref}
          src={playbackSrc || undefined}
          preload="auto"
          playsInline
          className="hidden"
        />
        <button
          type="button"
          className={cn(
            "grid h-10 w-10 shrink-0 cursor-pointer place-items-center self-center rounded-full border transition-[transform,opacity] active:scale-95",
            isMine
              ? "border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] text-[var(--primary)] hover:bg-[color-mix(in_oklab,var(--primary)_16%,var(--surface))]"
              : "border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--surface)_92%,var(--bg))] text-[var(--text)] shadow-[0_1px_0_rgba(15,23,42,0.05)] hover:bg-[color-mix(in_oklab,var(--muted)_10%,var(--surface))]",
          )}
          onClick={toggle}
          onKeyDown={handleSeekKeys}
          aria-label={playing ? "Pausa" : "Reproducir"}
        >
          {playing ? (
            <Pause size={isMine ? 20 : 18} strokeWidth={isMine ? 2.25 : 2} />
          ) : (
            <Play
              size={isMine ? 24 : 18}
              className="ml-0.5"
              strokeWidth={isMine ? 0 : 2}
              fill={isMine ? "currentColor" : "none"}
            />
          )}
        </button>
        <div
          ref={waveWrapRef}
          role="slider"
          tabIndex={0}
          aria-label="Posición en el audio"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-valuetext={`${formatTime(cur)} de ${formatTime(total)}`}
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-0.5",
            "cursor-pointer touch-none select-none",
            !isMine &&
              "rounded-[11px] border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] px-2 py-1",
            isMine && "px-0 py-0",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            "focus-visible:outline-[color-mix(in_oklab,var(--primary)_45%,transparent)]",
          )}
          onPointerDown={onWavePointerDown}
          onPointerMove={onWavePointerMove}
          onPointerUp={onWavePointerUp}
          onPointerCancel={onWavePointerUp}
          onKeyDown={handleSeekKeys}
        >
          <div className="relative h-[48px] min-h-[48px] w-full min-w-0">
            <canvas
              ref={canvasRef}
              className="block h-[48px] min-h-[48px] w-full"
              aria-hidden
            />
          </div>
          <div
            className={cn(
              "flex min-h-[1.125rem] items-baseline justify-between gap-2 px-0.5",
              isMine && "px-0",
            )}
          >
            <span className="inline-block min-w-[2.85rem] text-[11px] font-semibold tabular-nums text-[var(--text)]">
              {formatTime(cur)}
            </span>
            <span className="inline-block min-w-[2.85rem] text-right text-[10px] tabular-nums text-[var(--muted)]">
              {formatTime(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
