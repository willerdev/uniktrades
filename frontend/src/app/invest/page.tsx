"use client";

import { useEffect, useState } from "react";
import { InvestHub } from "@/components/investor/invest-hub";
import { InvestmentProductChooser } from "@/components/investor/investment-product-chooser";
import { AuthLoadingScreen, useRequireAuth } from "@/hooks/use-require-auth";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function InvestPage() {
  const { ready } = useRequireAuth();
  const [product, setProduct] = useState<"choose" | "smart">("choose");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void api.investor
      .status()
      .then((s) => {
        if (!cancelled && s.active) setProduct("smart");
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready || checking) return <AuthLoadingScreen />;

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 sm:max-w-xl sm:px-6 sm:py-6 xl:max-w-7xl xl:px-8 xl:py-8">
      <div className="xl:flex xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground xl:text-3xl">Invest</h1>
          <p className="mt-1 text-sm text-muted">
            Smart Investment or on-chain vault — see minimums, daily yields, and
            deposit into the product you choose.
          </p>
        </div>
      </div>

      {product === "choose" ? (
        <InvestmentProductChooser onChooseSmart={() => setProduct("smart")} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Smart Investment
              </h2>
              <p className="text-sm text-muted">
                Daily yield on your capital. New allocations earn after 24 hours.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setProduct("choose")}
            >
              Change product
            </Button>
          </div>
          <InvestHub />
        </div>
      )}
    </div>
  );
}
