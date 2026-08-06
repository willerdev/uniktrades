"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  title?: string;
  onClose?: () => void;
};

type State = { error: Error | null };

/**
 * Keeps deposit/withdraw modal failures from taking down /wallet.
 * insertBefore / portal teardown errors surface here instead of page error.tsx.
 */
export class WalletModalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[wallet-modal]", error, info);
  }

  render() {
    if (this.state.error) {
      const fallback = (
        <div className="modal-overlay fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="modal-panel w-full max-w-sm rounded-2xl border border-[var(--color-border)] p-6 text-center shadow-2xl">
            <h3 className="text-base font-semibold text-foreground">
              {this.props.title ?? "Something went wrong"}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {this.state.error.message || "The dialog hit a display error."}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => this.setState({ error: null })}
              >
                Try again
              </Button>
              {this.props.onClose && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    this.setState({ error: null });
                    this.props.onClose?.();
                  }}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      );
      if (typeof document !== "undefined") {
        return createPortal(fallback, document.body);
      }
      return fallback;
    }
    return this.props.children;
  }
}
