import { useCallback, useEffect, useState } from "react";
import { api, type DerivSettings } from "./api";

type Props = {
  onMessage: (msg: string) => void;
};

type Draft = {
  appId: string;
  apiToken: string;
  endpoint: string;
  oauthRedirectUrl: string;
  enabled: boolean;
  notes: string;
};

const EMPTY: Draft = {
  appId: "",
  apiToken: "",
  endpoint: "wss://ws.derivws.com/websockets/v3",
  oauthRedirectUrl: "",
  enabled: false,
  notes: "",
};

export function DerivPanel({ onMessage }: Props) {
  const [data, setData] = useState<DerivSettings | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyServer = useCallback((res: DerivSettings) => {
    setData(res);
    setDraft({
      appId: res.appId || "",
      apiToken: res.hasApiToken ? res.apiTokenMasked : "",
      endpoint: res.endpoint || EMPTY.endpoint,
      oauthRedirectUrl: res.oauthRedirectUrl || "",
      enabled: Boolean(res.enabled),
      notes: res.notes || "",
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      applyServer(await api.derivSettings());
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Failed to load Deriv settings");
    } finally {
      setLoading(false);
    }
  }, [applyServer, onMessage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save() {
    setSaving(true);
    try {
      const payload: Parameters<typeof api.updateDerivSettings>[0] = {
        appId: draft.appId,
        endpoint: draft.endpoint,
        oauthRedirectUrl: draft.oauthRedirectUrl,
        enabled: draft.enabled,
        notes: draft.notes,
      };
      // Only send token when the user typed a new value (not the masked placeholder).
      if (draft.apiToken && !draft.apiToken.includes("•")) {
        payload.apiToken = draft.apiToken;
      } else if (!draft.apiToken && data?.hasApiToken) {
        payload.apiToken = "";
      }
      applyServer(await api.updateDerivSettings(payload));
      onMessage("Deriv settings saved");
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section className="engine-page">
      <header className="engine-head">
        <div>
          <p className="engine-eyebrow">Integrations</p>
          <h2 className="engine-title">Deriv</h2>
          <p className="engine-desc muted">
            Credentials for the Deriv WebSocket API (
            <code>app_id</code>, authorize token, endpoint). Used when connecting
            programmatically — register an app at{" "}
            <a
              href="https://api.deriv.com/"
              target="_blank"
              rel="noreferrer"
            >
              api.deriv.com
            </a>
            .
          </p>
        </div>
        <div className="engine-head-actions">
          <button type="button" className="ghost" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </button>
          <button type="button" onClick={() => void save()} disabled={saving || loading}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      {loading && !data ? (
        <p className="muted">Loading Deriv settings…</p>
      ) : (
        <div className="config-panel">
          <label className="config-toggle">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setField("enabled", e.target.checked)}
            />
            <span>Enable Deriv API connection</span>
          </label>

          <div className="form-grid config-form-grid">
            <label>
              App ID
              <input
                value={draft.appId}
                onChange={(e) => setField("appId", e.target.value)}
                placeholder="e.g. 1089"
                autoComplete="off"
              />
            </label>
            <label>
              API token
              <input
                type="password"
                value={draft.apiToken}
                onChange={(e) => setField("apiToken", e.target.value)}
                placeholder={
                  data?.hasApiToken
                    ? "•••• (leave as-is to keep, clear to remove)"
                    : "Paste Deriv API token"
                }
                autoComplete="new-password"
              />
            </label>
            <label className="span-2">
              WebSocket endpoint
              <input
                value={draft.endpoint}
                onChange={(e) => setField("endpoint", e.target.value)}
                placeholder="wss://ws.derivws.com/websockets/v3"
                autoComplete="off"
              />
            </label>
            <label className="span-2">
              OAuth redirect URL (optional)
              <input
                value={draft.oauthRedirectUrl}
                onChange={(e) => setField("oauthRedirectUrl", e.target.value)}
                placeholder="https://your-app.example/oauth/deriv"
                autoComplete="off"
              />
            </label>
            <label className="span-2">
              Notes
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Account labels, scopes, which environment (demo/real)…"
              />
            </label>
          </div>

          {data?.websocketUrl && (
            <p className="config-hint muted">
              Connect URL: <code>{data.websocketUrl}</code>
              {data.hasApiToken ? " · token stored" : " · no token yet"}
            </p>
          )}

          <p className="config-hint muted">
            Docs:{" "}
            <a href={data?.docsUrl || "https://developers.deriv.com/docs/websockets"} target="_blank" rel="noreferrer">
              Deriv WebSocket API
            </a>
            . Authorize with{" "}
            <code>{`{ "authorize": "<token>" }`}</code> after connect.
          </p>
        </div>
      )}
    </section>
  );
}
