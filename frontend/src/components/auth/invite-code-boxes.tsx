"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

const CODE_LEN = 8;

/** OTP-style 8-character boxes (XXXX – XXXX). */
export function InviteCodeBoxes({
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const chars = Array.from({ length: CODE_LEN }, (_, i) => value[i] ?? "");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setAt = useCallback(
    (index: number, raw: string) => {
      const cleaned = raw.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
      if (!cleaned) {
        const next = chars.map((c, i) => (i === index ? "" : c)).join("");
        onChange(next.slice(0, CODE_LEN));
        return;
      }
      const digits = cleaned.split("");
      const next = [...chars];
      let cursor = index;
      for (const d of digits) {
        if (cursor >= CODE_LEN) break;
        next[cursor] = d;
        cursor += 1;
      }
      onChange(next.join("").slice(0, CODE_LEN));
      const focusIdx = Math.min(cursor, CODE_LEN - 1);
      refs.current[focusIdx]?.focus();
      refs.current[focusIdx]?.select();
    },
    [chars, onChange],
  );

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !chars[index] && index > 0) {
      e.preventDefault();
      const next = chars.map((c, i) => (i === index - 1 ? "" : c)).join("");
      onChange(next);
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < CODE_LEN - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^0-9a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, CODE_LEN);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, CODE_LEN - 1);
    refs.current[focusIdx]?.focus();
  }

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2" onPaste={onPaste}>
      {chars.map((ch, i) => (
        <div key={i} className="contents">
          {i === 4 && (
            <span className="mx-0.5 select-none text-xl font-semibold text-muted" aria-hidden>
              –
            </span>
          )}
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            maxLength={1}
            disabled={disabled}
            value={ch}
            aria-label={`Character ${i + 1}`}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "h-12 w-10 rounded-xl border border-[var(--color-border)] bg-background text-center",
              "font-mono text-lg font-semibold uppercase text-foreground outline-none transition",
              "focus:border-primary focus:ring-2 focus:ring-primary/25 sm:h-14 sm:w-11",
              disabled && "opacity-60",
            )}
          />
        </div>
      ))}
    </div>
  );
}
