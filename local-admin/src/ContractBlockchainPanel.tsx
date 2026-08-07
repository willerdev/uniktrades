import { useCallback, useEffect, useState } from "react";
import { api, type ContractBlockchainSettings } from "./api";

type Props = {
  onMessage: (msg: string) => void;
};

type Draft = {
  contractAddress: string;
  chainId: string;
  networkLabel: string;
  networkKind: string;
  abi: string;
  rpcUrl: string;
  adminWallet: string;
  explorerUrl: string;
  remixRef: string;
  notes: string;
};

const EMPTY: Draft = {
  contractAddress: "",
  chainId: "",
  networkLabel: "",
  networkKind: "",
  abi: "",
  rpcUrl: "",
  adminWallet: "",
  explorerUrl: "",
  remixRef: "",
  notes: "",
};

const NETWORK_PRESETS: Array<{
  label: string;
  kind: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
}> = [
  {
    label: "Polygon Amoy",
    kind: "polygon",
    chainId: 80002,
    rpcUrl: "https://polygon-amoy-bor-rpc.publicnode.com",
    explorerUrl: "https://amoy.polygonscan.com",
  },
  {
    label: "BNB Smart Chain",
    kind: "bsc",
    chainId: 56,
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
  },
  {
    label: "BNB Testnet",
    kind: "bsc",
    chainId: 97,
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorerUrl: "https://testnet.bscscan.com",
  },
  {
    label: "Ethereum",
    kind: "ethereum",
    chainId: 1,
    rpcUrl: "https://ethereum.publicnode.com",
    explorerUrl: "https://etherscan.io",
  },
];

export function ContractBlockchainPanel({ onMessage }: Props) {
  const [data, setData] = useState<ContractBlockchainSettings | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyServer = useCallback((res: ContractBlockchainSettings) => {
    setData(res);
    setDraft({
      contractAddress: res.contractAddress || "",
      chainId: res.chainId != null ? String(res.chainId) : "",
      networkLabel: res.networkLabel || "",
      networkKind: res.networkKind || "",
      abi: res.abi || "",
      rpcUrl: res.rpcUrl || "",
      adminWallet: res.adminWallet || "",
      explorerUrl: res.explorerUrl || "",
      remixRef: res.remixRef || "",
      notes: res.notes || "",
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      applyServer(await api.contractBlockchainSettings());
    } catch (err) {
      onMessage(
        err instanceof Error ? err.message : "Failed to load contract settings",
      );
    } finally {
      setLoading(false);
    }
  }, [applyServer, onMessage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function applyPreset(chainId: number) {
    const preset = NETWORK_PRESETS.find((p) => p.chainId === chainId);
    if (!preset) return;
    setDraft((prev) => ({
      ...prev,
      chainId: String(preset.chainId),
      networkLabel: preset.label,
      networkKind: preset.kind,
      rpcUrl: prev.rpcUrl || preset.rpcUrl,
      explorerUrl: prev.explorerUrl || preset.explorerUrl,
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const chainIdRaw = draft.chainId.trim();
      const chainId =
        chainIdRaw === "" ? undefined : Number(chainIdRaw);
      if (chainIdRaw !== "" && (!Number.isFinite(chainId) || (chainId ?? 0) <= 0)) {
        onMessage("chainId must be a positive number");
        setSaving(false);
        return;
      }
      applyServer(
        await api.updateContractBlockchainSettings({
          contractAddress: draft.contractAddress,
          chainId: chainId ?? null,
          networkLabel: draft.networkLabel,
          networkKind: draft.networkKind,
          abi: draft.abi,
          rpcUrl: draft.rpcUrl,
          adminWallet: draft.adminWallet,
          explorerUrl: draft.explorerUrl,
          remixRef: draft.remixRef,
          notes: draft.notes,
        }),
      );
      onMessage("Contract blockchain settings saved");
    } catch (err) {
      onMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const effective = data?.effective;

  return (
    <section className="engine-page">
      <header className="engine-head">
        <div>
          <p className="engine-eyebrow">On-chain</p>
          <h2 className="engine-title">Contract blockchain</h2>
          <p className="engine-desc muted">
            Configure the vault/contract you are about to launch. Deploy from{" "}
            <a
              href={data?.remixUrl || "https://remix.ethereum.org/"}
              target="_blank"
              rel="noreferrer"
            >
              Remix IDE
            </a>
            , then paste address, ABI, RPC, and explorer details here. Saved
            values override env and feed{" "}
            <code>/blockchain/contract/config</code>.
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
        <p className="muted">Loading contract settings…</p>
      ) : (
        <div className="config-panel">
          <div className="config-presets">
            <span className="muted">Network presets:</span>
            {NETWORK_PRESETS.map((p) => (
              <button
                key={p.chainId}
                type="button"
                className="ghost compact"
                onClick={() => applyPreset(p.chainId)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="form-grid config-form-grid">
            <label className="span-2">
              Contract address
              <input
                value={draft.contractAddress}
                onChange={(e) => setField("contractAddress", e.target.value)}
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label>
              Chain ID
              <input
                value={draft.chainId}
                onChange={(e) => setField("chainId", e.target.value)}
                placeholder="80002"
                inputMode="numeric"
                autoComplete="off"
              />
            </label>
            <label>
              Network label
              <input
                value={draft.networkLabel}
                onChange={(e) => setField("networkLabel", e.target.value)}
                placeholder="Polygon Amoy"
                autoComplete="off"
              />
            </label>
            <label>
              Network kind
              <input
                value={draft.networkKind}
                onChange={(e) => setField("networkKind", e.target.value)}
                placeholder="polygon | bsc | ethereum"
                autoComplete="off"
              />
            </label>
            <label>
              Admin / owner wallet
              <input
                value={draft.adminWallet}
                onChange={(e) => setField("adminWallet", e.target.value)}
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="span-2">
              RPC URL
              <input
                value={draft.rpcUrl}
                onChange={(e) => setField("rpcUrl", e.target.value)}
                placeholder="https://…"
                autoComplete="off"
              />
            </label>
            <label className="span-2">
              Explorer URL
              <input
                value={draft.explorerUrl}
                onChange={(e) => setField("explorerUrl", e.target.value)}
                placeholder="https://amoy.polygonscan.com"
                autoComplete="off"
              />
            </label>
            <label className="span-2">
              ABI (JSON)
              <textarea
                rows={8}
                value={draft.abi}
                onChange={(e) => setField("abi", e.target.value)}
                placeholder='[{ "type": "function", "name": "…", … }]'
                spellCheck={false}
                className="mono-input"
              />
            </label>
            <label className="span-2">
              Remix project reference
              <input
                value={draft.remixRef}
                onChange={(e) => setField("remixRef", e.target.value)}
                placeholder="Remix workspace / gist / contract file name"
                autoComplete="off"
              />
            </label>
            <label className="span-2">
              Notes
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Deployment checklist, constructor args, verification status…"
              />
            </label>
          </div>

          {effective && (
            <div className="config-effective">
              <p className="engine-eyebrow">Effective (DB → env fallback)</p>
              <ul className="muted">
                <li>
                  Address:{" "}
                  <code>{effective.contractAddress || "—"}</code>
                  {effective.configured ? " · configured" : " · not configured"}
                </li>
                <li>
                  {effective.networkLabel} · chainId {effective.chainId}
                </li>
                <li>
                  RPC: <code>{effective.rpcUrl}</code>
                </li>
                <li>
                  Explorer:{" "}
                  <a href={effective.explorerUrl} target="_blank" rel="noreferrer">
                    {effective.explorerUrl}
                  </a>
                </li>
              </ul>
            </div>
          )}

          <p className="config-hint muted">
            Tip: open{" "}
            <a href="https://remix.ethereum.org/" target="_blank" rel="noreferrer">
              remix.ethereum.org
            </a>
            , compile & deploy, then copy the address and ABI JSON into this form.
          </p>
        </div>
      )}
    </section>
  );
}
