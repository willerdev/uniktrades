"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function WalletError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[wallet]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold text-foreground">
        Wallet hit a snag
      </h2>
      <p className="text-sm text-muted">
        {error.message || "Something went wrong on the wallet page."} If you
        already generated a deposit address, tap Try again — you can start a new
        deposit from the wallet.
      </p>
      <div className="flex gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.location.assign("/wallet")}
        >
          Reload
        </Button>
      </div>
    </div>
  );
}
