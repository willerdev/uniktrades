"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders modal UI into document.body so page re-renders / sibling DOM thrash
 * (and browser extensions mutating React trees) cannot break insertBefore.
 * Returns null until client-mounted and open.
 */
export function ModalPortal({
  open,
  children,
  lockScroll = true,
}: {
  open: boolean;
  children: ReactNode;
  lockScroll?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !lockScroll || !mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockScroll, mounted]);

  if (!mounted || !open) return null;

  return createPortal(children, document.body);
}
