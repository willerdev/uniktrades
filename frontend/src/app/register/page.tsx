"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";
import { validateDisplayName } from "@/lib/display-name";
import { useT } from "@/i18n";
import { api } from "@/lib/api";
import { InviteCodeBoxes } from "@/components/auth/invite-code-boxes";

type Step = "code" | "form";

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const { register } = useAuthStore();
  const [step, setStep] = useState<Step>("code");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref?.trim()) {
      const code = ref.trim().toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 8);
      setInviteCode(code);
      if (code.length === 8) {
        void api.auth
          .validateInviteCode(code)
          .then(() => setStep("form"))
          .catch(() => {
            /* stay on code step with prefilled boxes */
          })
          .finally(() => setReady(true));
        return;
      }
    }
    setReady(true);
  }, []);

  async function handleConfirmCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 8) {
      setError(t("register.codeIncomplete"));
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.validateInviteCode(code);
      setInviteCode(res.code);
      setStep("form");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("register.codeInvalid"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!inviteCode.trim()) {
      setError(t("register.codeInvalid"));
      setStep("code");
      return;
    }
    if (!acceptTerms) {
      setError(t("register.needTerms"));
      return;
    }
    const nameError = validateDisplayName(displayName);
    if (nameError) {
      setError(nameError);
      return;
    }
    setLoading(true);
    try {
      await register(
        email,
        password,
        displayName,
        true,
        inviteCode.trim().toUpperCase(),
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("register.failed"));
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-2xl text-success">
              ✓
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {t("register.successTitle")}
            </h2>
            <p className="mt-2 text-muted">{t("register.successBody")}</p>
            <Button className="mt-6" onClick={() => router.push("/login")}>
              {t("register.continueLogin")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-[var(--color-border)] shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <KeyRound className="h-6 w-6" strokeWidth={2} />
              </div>
              <CardTitle className="text-2xl">{t("register.codeTitle")}</CardTitle>
              <CardDescription className="text-base">
                {t("register.codeSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirmCode} className="space-y-6">
                <InviteCodeBoxes
                  value={inviteCode}
                  onChange={(v) => {
                    setInviteCode(v);
                    setError("");
                  }}
                  disabled={loading}
                  autoFocus
                />
                {error && (
                  <p className="text-center text-sm text-danger">{error}</p>
                )}
                <Button
                  type="submit"
                  className="h-12 w-full rounded-full text-base"
                  disabled={loading || inviteCode.length !== 8}
                >
                  {loading ? t("register.codeChecking") : t("register.codeConfirm")}
                </Button>
                <p className="text-center text-sm text-muted">
                  {t("register.haveAccount")}{" "}
                  <Link href="/login" className="font-medium text-primary hover:underline">
                    {t("common.signIn")}
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t("register.joinTitle")}</CardTitle>
            <CardDescription>{t("register.joinSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t("register.displayName")}</Label>
                <Input
                  id="displayName"
                  placeholder={t("register.displayPlaceholder")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={40}
                />
                <p className="text-xs text-muted">{t("register.displayHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="trader@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("common.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("register.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <label className="flex items-start gap-3 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 rounded border-[var(--color-border)]"
                />
                <span>
                  {t("register.acceptTermsPrefix")}{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    {t("register.termsLink")}
                  </Link>{" "}
                  {t("register.acceptTermsSuffix")}
                </span>
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !acceptTerms}
              >
                {loading ? t("register.creating") : t("register.createAccount")}
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-muted hover:text-foreground"
                onClick={() => {
                  setStep("code");
                  setError("");
                }}
              >
                {t("register.changeCode")}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-muted">
              {t("register.haveAccount")}{" "}
              <Link href="/login" className="text-primary hover:underline">
                {t("common.signIn")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
