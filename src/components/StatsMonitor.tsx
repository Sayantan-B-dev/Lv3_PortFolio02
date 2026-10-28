"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { CONTENT } from "@/content/config";
import {
  consumeFrameStats,
  frameStats,
  renderMetrics,
} from "./renderMetrics";

type Sample = {
  fps: number;
  frameMs: number;
  jitter: number;
  heapMb: number;
  heapPercent: number;
  nodes: number;
  longTasks: number;
  rtt: number | null;
};

const EMPTY: Sample = {
  fps: 0,
  frameMs: 0,
  jitter: 0,
  heapMb: 0,
  heapPercent: 0,
  nodes: 0,
  longTasks: 0,
  rtt: null,
};

const SAMPLE_MS = 1000;

/** Chrome exposes the JS heap; other engines simply leave the row blank. */
function readHeap() {
  const memory = (
    performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    }
  ).memory;

  if (!memory) return { heapMb: 0, heapPercent: 0 };

  return {
    heapMb: memory.usedJSHeapSize / 1048576,
    // The percentage of the heap limit is a better warning than the raw MB.
    heapPercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
  };
}

/**
 * Frames are counted on the render loop by the bridge inside the canvas; this
 * card only reads the window once a second. It used to run a second animation
 * loop just to measure the first, which was measurable overhead on its own.
 */
export function StatsMonitor() {
  const [sample, setSample] = useState<Sample>(EMPTY);

  useEffect(() => {
    let longTasks = 0;
    let windowStart = performance.now();

    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        longTasks += list.getEntries().length;
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      observer = null;
    }

    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.max(now - windowStart, 1);
      const frames = consumeFrameStats();
      const frameMs = frames.frames > 0 ? frames.totalMs / frames.frames : 0;
      const connection = (
        navigator as Navigator & { connection?: { rtt?: number } }
      ).connection;

      setSample({
        fps: (frames.frames * 1000) / elapsed,
        frameMs,
        // How far the slowest frame in the window ran past the average.
        jitter: frames.frames > 0 ? Math.max(frames.worstMs - frameMs, 0) : 0,
        ...readHeap(),
        nodes: document.getElementsByTagName("*").length,
        longTasks,
        rtt: typeof connection?.rtt === "number" ? connection.rtt : null,
      });

      longTasks = 0;
      windowStart = now;
    }, SAMPLE_MS);

    return () => {
      window.clearInterval(timer);
      observer?.disconnect();
    };
  }, []);

  const slow = sample.fps > 0 && sample.fps < 45;
  const copy = CONTENT.ui.stats;

  return (
    <div className="w-25 rounded-md border border-[#f6ebdd]/15 bg-[#0b0b12]/70 px-3 py-2 text-[0.62rem] leading-4 text-[#f6ebdd]/70 backdrop-blur-sm">
      <p className="text-[0.45rem] font-semibold uppercase tracking-[0.24em] text-[#c99b52]">
        {copy.title}
      </p>

      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2">
        <Row label={copy.labels.fps} value={sample.fps.toFixed(0)} alert={slow} />
        <Row
          label={copy.labels.frameMs}
          value={sample.frameMs.toFixed(1)}
          alert={slow}
        />
        <Row label={copy.labels.jitter} value={sample.jitter.toFixed(1)} />
        <Row label={copy.labels.draws} value={String(renderMetrics.calls)} />
        <Row
          label={copy.labels.triangles}
          value={formatCount(renderMetrics.triangles)}
        />
        <Row label={copy.labels.textures} value={String(renderMetrics.textures)} />
        <Row
          label={copy.labels.geometries}
          value={String(renderMetrics.geometries)}
        />
        <Row
          label={copy.labels.heapMb}
          value={sample.heapMb > 0 ? sample.heapMb.toFixed(0) : copy.unavailable}
        />
        <Row
          label={copy.labels.heapPercent}
          value={
            sample.heapPercent > 0
              ? `${sample.heapPercent.toFixed(0)}%`
              : copy.unavailable
          }
        />
        <Row label={copy.labels.nodes} value={String(sample.nodes)} />
        <Row label={copy.labels.tasks} value={String(sample.longTasks)} />
        <Row
          label={copy.labels.ping}
          value={sample.rtt === null ? copy.local : `${sample.rtt} ms`}
        />
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <>
      <dt className="uppercase text-[0.45rem] tracking-[0.08em] text-[#ffffff]/60">{label}</dt>
      <dd
        className={`text-right text-[0.45rem]  tabular-nums ${alert ? "text-[#e6a08c]" : "text-[#f6ebdd]/85"}`}
      >
        {value}
      </dd>
    </>
  );
}

function formatCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

/**
 * Lives inside the canvas: copies three's counters and the frame time into the
 * shared object once per frame. It must be the last writer, so it does not
 * touch React state.
 */
export function RenderMetricsBridge() {
  const gl = useThree((state) => state.gl);

  useFrame((_, delta) => {
    const info = gl.info;
    renderMetrics.calls = info.render.calls;
    renderMetrics.triangles = info.render.triangles;
    renderMetrics.geometries = info.memory.geometries;
    renderMetrics.textures = info.memory.textures;

    const ms = delta * 1000;
    if (ms > 0 && ms < 1000) {
      frameStats.frames += 1;
      frameStats.totalMs += ms;
      frameStats.worstMs = Math.max(frameStats.worstMs, ms);
    }
  });

  return null;
}

