"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function InvestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[invest]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold text-foreground">
        Invest page hit a snag
      </h2>
      <p className="text-sm text-muted">
        {error.message || "Something went wrong loading Smart-Invest."} If you
        already started a crypto payment, tap Try again — your invoice will be
        restored.
      </p>
      <div className="flex gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.location.assign("/invest")}>
          Reload
        </Button>
      </div>
    </div>
  );
}
