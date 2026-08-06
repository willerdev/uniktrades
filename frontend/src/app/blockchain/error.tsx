"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function BlockchainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[blockchain]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold text-foreground">
        Blockchain page hit a snag
      </h2>
      <p className="text-sm text-muted">
        {error.message ||
          "Something went wrong loading the vault or verification flow."}{" "}
        Your progress is saved — tap Try again to continue.
      </p>
      <div className="flex gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.location.assign("/blockchain")}
        >
          Reload
        </Button>
      </div>
    </div>
  );
}
