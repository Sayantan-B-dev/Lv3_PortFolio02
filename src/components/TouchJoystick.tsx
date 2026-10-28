"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type MoveInput = { x: number; z: number };

type TouchJoystickProps = {
  /** Shared with PlayerControls: x pushes right, z pushes forward/up. */
  inputRef: { current: MoveInput };
  label: string;
  disabled?: boolean;
};

const KNOB_REST = "translate(-50%, -50%)";
/** Ignore thumb jitter at the centre so the walk sound does not flicker. */
const DEAD_ZONE = 0.12;

/**
 * The phone's walking stick. It only writes to a ref, so holding it never
 * re-renders React; the knob itself is moved through a transform.
 */
export function TouchJoystick({
  inputRef,
  label,
  disabled = false,
}: TouchJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const pointerRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  const release = useCallback(() => {
    inputRef.current.x = 0;
    inputRef.current.z = 0;
    pointerRef.current = null;
    if (knobRef.current) knobRef.current.style.transform = KNOB_REST;
  }, [inputRef]);

  // Opening the menu freezes the stick without waiting for the thumb to lift.
  useEffect(() => {
    if (!disabled) return;
    release();
  }, [disabled, release]);

  // A joystick that unmounts mid-drag must not leave the walker moving.
  useEffect(
    () => () => {
      inputRef.current.x = 0;
      inputRef.current.z = 0;
    },
    [inputRef],
  );

  const update = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;

    const rect = base.getBoundingClientRect();
    const radius = rect.width / 2;
    const dx = (clientX - (rect.left + radius)) / radius;
    const dy = (clientY - (rect.top + radius)) / radius;
    const length = Math.hypot(dx, dy);
    const reach = length > 1 ? 1 / length : 1;
    const x = dx * reach;
    const y = dy * reach;

    inputRef.current.x = Math.abs(x) < DEAD_ZONE ? 0 : x;
    inputRef.current.z = Math.abs(y) < DEAD_ZONE ? 0 : -y;

    if (knobRef.current) {
      const travel = radius * 0.62;
      knobRef.current.style.transform = `translate(calc(-50% + ${x * travel}px), calc(-50% + ${y * travel}px))`;
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || pointerRef.current !== null) return;

    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setActive(true);
    update(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    update(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    release();
    setActive(false);
  };

  return (
    <div
      ref={baseRef}
      role="group"
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative h-[10.8rem] w-[10.8rem] touch-none select-none rounded-full border bg-[#0b0b12]/35 transition-colors ${
        active && !disabled ? "border-[#c99b52]/70" : "border-[#f6ebdd]/20"
      }`}
    >
      <span className="pointer-events-none absolute inset-[0.9rem] rounded-full border border-dashed border-[#f6ebdd]/15" />

      <span
        ref={knobRef}
        style={{ transform: KNOB_REST }}
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[4.2rem] w-[4.2rem] rounded-full bg-[#f6ebdd]/20 ring-1 ring-[#f6ebdd]/35 ${
          active && !disabled
            ? ""
            : "transition-transform duration-150 ease-out"
        }`}
      />

      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[0.6rem] h-[0.45rem] w-[0.45rem] -translate-x-1/2 rounded-full bg-[#f6ebdd]/35"
      />
    </div>
  );
}
