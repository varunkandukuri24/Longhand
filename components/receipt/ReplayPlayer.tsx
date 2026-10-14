"use client";

import {
  buildReplayTimeline,
  eventIndexAtPlaybackTime,
  textAtEventIndex,
  type ReplayTimeline,
} from "@/lib/receipt/replay-timeline";
import type { EditEvent } from "@/lib/receipt/types";
import { useCallback, useEffect, useRef, useState } from "react";

const SPEEDS = [1, 4, 16] as const;

type ReplayPlayerProps = {
  slug: string;
};

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      timeline: ReplayTimeline;
      finalText: string;
      matches: boolean;
    };

export function ReplayPlayer({ slug }: ReplayPlayerProps) {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<LoadState>({ status: "idle" });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [playbackMs, setPlaybackMs] = useState(0);
  const [finished, setFinished] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const playbackMsRef = useRef(0);
  const speedRef = useRef(speed);

  useEffect(() => {
    playbackMsRef.current = playbackMs;
  }, [playbackMs]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const loadReplay = useCallback(async () => {
    setLoad({ status: "loading" });
    setOpen(true);
    setPlaying(false);
    setFinished(false);
    setPlaybackMs(0);
    try {
      const res = await fetch(`/api/p/${slug}/replay`);
      if (!res.ok) {
        setLoad({ status: "error" });
        return;
      }
      const body = (await res.json()) as {
        events: EditEvent[];
        finalText: string;
        matches: boolean;
      };
      const timeline = buildReplayTimeline(body.events);
      setLoad({
        status: "ready",
        timeline,
        finalText: body.finalText,
        matches: body.matches,
      });
    } catch {
      setLoad({ status: "error" });
    }
  }, [slug]);

  useEffect(() => {
    if (!playing || load.status !== "ready") {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameRef.current = null;
      return;
    }

    const duration = load.timeline.durationMs;
    const tick = (now: number) => {
      const last = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const delta = (now - last) * speedRef.current;
      const next = Math.min(duration, playbackMsRef.current + delta);
      playbackMsRef.current = next;
      setPlaybackMs(next);

      if (next >= duration) {
        setPlaying(false);
        setFinished(true);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameRef.current = null;
    };
  }, [playing, load]);

  if (!open) {
    return (
      <button
        type="button"
        className="font-ui text-[12px] text-page/55 underline-offset-2 hover:underline"
        onClick={() => {
          void loadReplay();
        }}
      >
        Watch it being written
      </button>
    );
  }

  if (load.status === "loading" || load.status === "idle") {
    return (
      <p className="font-ui text-[12px] text-page/55">Loading replay</p>
    );
  }

  if (load.status === "error") {
    return (
      <p className="font-ui text-[12px] text-page/55">Replay unavailable</p>
    );
  }

  const { timeline, matches } = load;
  const eventCount = eventIndexAtPlaybackTime(timeline, playbackMs);
  const text = textAtEventIndex(timeline, eventCount);
  const atEnd =
    finished ||
    (timeline.durationMs === 0
      ? true
      : playbackMs >= timeline.durationMs);

  return (
    <div className="w-full">
      <div className="min-h-[200px] whitespace-pre-wrap rounded-[6px] bg-page px-12 py-10 font-writing text-[21px] leading-[1.75] text-ink shadow-page">
        {text}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 font-ui text-[12px] text-page/70">
        <button
          type="button"
          className="underline-offset-2 hover:underline"
          onClick={() => {
            if (atEnd) {
              setPlaybackMs(0);
              setFinished(false);
              setPlaying(true);
              return;
            }
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : atEnd ? "Replay" : "Play"}
        </button>

        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={[
              "underline-offset-2 hover:underline",
              speed === s ? "text-lamp" : "",
            ].join(" ")}
            onClick={() => setSpeed(s)}
          >
            {s}x
          </button>
        ))}

        <input
          type="range"
          min={0}
          max={Math.max(timeline.durationMs, 1)}
          value={Math.min(playbackMs, timeline.durationMs)}
          onChange={(e) => {
            const value = Number(e.target.value);
            setPlaying(false);
            setFinished(value >= timeline.durationMs);
            setPlaybackMs(value);
          }}
          className="min-w-[120px] flex-1 accent-lamp"
          aria-label="Replay position"
        />

        <button
          type="button"
          className="underline-offset-2 hover:underline"
          onClick={() => {
            setOpen(false);
            setPlaying(false);
            setLoad({ status: "idle" });
          }}
        >
          Close
        </button>
      </div>

      {atEnd ? (
        <p className="mt-3 font-ui text-[12px] text-page/55">
          {matches
            ? "Replay matches the published text."
            : "Replay does not match the published text."}
        </p>
      ) : null}
    </div>
  );
}
