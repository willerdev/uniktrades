"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, type ReferralInfo } from "@/lib/api";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

/** Prominent personal invite code on the dashboard. */
export function InviteCodeCard() {
  const t = useT();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    api.referrals
      .me()
      .then(setInfo)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("invite.loadError")),
      );
  }, [t]);

  async function copy(kind: "code" | "link") {
    if (!info) return;
    const text = kind === "code" ? info.code : info.link;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError(t("invite.copyError"));
    }
  }

  const code = info?.code ?? "————————";
  const left = code.slice(0, 4);
  const right = code.slice(4, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Share2 className="h-3.5 w-3.5" />
                {t("invite.eyebrow")}
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {t("invite.title")}
              </h2>
              <p className="mt-1.5 max-w-md text-sm text-muted">
                {t("invite.subtitle")}
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              <div
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)]",
                  "bg-background px-4 py-3 font-mono text-2xl font-bold tracking-[0.2em] text-foreground sm:text-3xl",
                )}
                aria-label={t("invite.yourCode")}
              >
                <span>{left || "····"}</span>
                <span className="text-muted">–</span>
                <span>{right || "····"}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={!info}
                  onClick={() => void copy("code")}
                >
                  {copied === "code" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied === "code" ? t("invite.copied") : t("invite.copyCode")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  disabled={!info}
                  onClick={() => void copy("link")}
                >
                  {copied === "link" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  {copied === "link" ? t("invite.copied") : t("invite.copyLink")}
                </Button>
              </div>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}
