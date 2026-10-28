"use client";

import { useLayoutEffect, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

type WallTextProps = {
  text: string;
  position: [number, number, number];
  size: [number, number];
  /** Tilt the plane, e.g. lay text flat on a table note. */
  rotation?: [number, number, number];
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  opacity?: number;
  fontFamily?: string;
  align?: "left" | "center";
};

const TEXTURE_WIDTH = 1024;
const HORIZONTAL_PADDING = 24;
const MIN_FONT_SIZE = 18;

function wrapLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}

export function WallText({
  text,
  position,
  size,
  rotation,
  fontSize = 48,
  fontWeight = 700,
  color = "#f6ebdd",
  opacity = 1,
  fontFamily = '"Montenegrin Gothic One", serif',
  align = "center",
}: WallTextProps) {
  const [width, height] = size;
  const [texture, setTexture] = useState<CanvasTexture | null>(null);

  // Draw immediately so the text is readable from the first frame, then redraw
  // once the webfont has loaded: Canvas2D falls back silently before that, but
  // waiting for the font request first leaves a blank plane for the visit.
  useLayoutEffect(() => {
    let cancelled = false;
    let drawn: CanvasTexture | null = null;

    const draw = () => {
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      canvas.width = TEXTURE_WIDTH;
      canvas.height = Math.max(64, Math.round((TEXTURE_WIDTH * height) / width));

      const context = canvas.getContext("2d");
      if (!context) return;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = color;
      context.textAlign = align;
      context.textBaseline = "middle";

      // No halo: a tight dark shadow keeps the letters crisp and readable
      // without the blurred glow that made the wall copy look out of focus.
      context.shadowColor = "rgba(0, 0, 0, 0.6)";
      context.shadowBlur = 6;
      context.shadowOffsetY = 2;

      // Canvas text has no automatic fit, so a long caption used to run past
      // the plane and clip. Step the size down until every wrapped line lands
      // inside the sheet.
      const maxWidth = canvas.width - HORIZONTAL_PADDING * 2;
      const maxHeight = canvas.height - HORIZONTAL_PADDING / 2;
      let fittedSize = fontSize;
      let lines: string[] = [];
      let lineHeight = fittedSize * 1.18;

      for (; fittedSize >= MIN_FONT_SIZE; fittedSize -= 2) {
        context.font = `${fontWeight} ${fittedSize}px ${fontFamily}`;
        lines = wrapLines(context, text, maxWidth);
        lineHeight = fittedSize * 1.18;
        if (lines.length * lineHeight <= maxHeight) break;
      }

      context.font = `${fontWeight} ${fittedSize}px ${fontFamily}`;

      const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
      const textX =
        align === "left" ? HORIZONTAL_PADDING : canvas.width / 2;

      lines.forEach((line, index) => {
        context.fillText(line, textX, startY + index * lineHeight);
      });

      const nextTexture = new CanvasTexture(canvas);
      nextTexture.colorSpace = SRGBColorSpace;
      nextTexture.anisotropy = 4;

      const previous = drawn;
      drawn = nextTexture;
      setTexture(nextTexture);
      previous?.dispose();
    };

    draw();

    // Upgrade pass: redraw once the webfont settles, success or failure.
    if (typeof document.fonts?.load === "function") {
      document.fonts
        .load(`${fontWeight} ${fontSize}px ${fontFamily}`)
        .then(draw, () => undefined);
    }

    return () => {
      cancelled = true;
      drawn?.dispose();
    };
  }, [text, width, height, fontSize, fontWeight, color, fontFamily, align]);

  // A plane without its texture would render as a solid white block.
  if (!texture) return null;

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}
