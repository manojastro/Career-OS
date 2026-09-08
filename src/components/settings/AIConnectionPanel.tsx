"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Lock } from "lucide-react";
import { Card, SectionHeading, Button, Badge, Input } from "@/components/ui/Primitives";

type Status = "idle" | "testing" | "connected" | "not_configured" | "error";

export function AIConnectionPanel() {
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [gateConfigured, setGateConfigured] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [passphrase, setPassphrase] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/session")
      .then((r) => r.json())
      .then((data) => {
        setGateConfigured(Boolean(data.gateConfigured));
        setUnlocked(Boolean(data.unlocked));
      })
      .catch(() => {});
  }, []);

  async function unlock() {
    setUnlockError(null);
    const res = await fetch("/api/ai/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passphrase }) });
    if (res.ok) {
      setUnlocked(true);
      setPassphrase("");
    } else {
      const data = await res.json().catch(() => ({}));
      setUnlockError(data.error ?? "Incorrect passphrase.");
    }
  }

  async function testConnection() {
    setStatus("testing");
    setDetail(null);
    try {
      const res = await fetch("/api/ai/test-connection", { method: "POST" });
      const data = await res.json();
      if (data.reason === "connected") {
        setStatus("connected");
        setModel(data.model ?? null);
        setDetail(data.message ?? "Connected.");
        return;
      }
      if (data.reason === "locked") {
        setUnlocked(false);
        setStatus("idle");
        return;
      }
      setStatus(data.reason === "not_configured" ? "not_configured" : "error");
      setDetail(data.message ?? "Could not verify the connection.");
    } catch (e) {
      setStatus("error");
      setDetail(e instanceof Error ? e.message : "Network error while testing the connection.");
    }
  }

  return (
    <Card>
      <SectionHeading title="AI assistant connection" subtitle="Configured server-side only. Manual use of the portal always works, with or without this." />
      <div className="space-y-3">
        {gateConfigured && !unlocked ? (
          <div className="space-y-2 rounded-lg border border-line p-3">
            <p className="flex items-center gap-1.5 text-sm text-ink">
              <Lock size={14} /> This deployment requires an owner passphrase before the assistant or connection test can be used.
            </p>
            <div className="flex gap-2">
              <Input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Owner passphrase" onKeyDown={(e) => e.key === "Enter" && unlock()} />
              <Button size="sm" onClick={unlock} disabled={!passphrase}>
                Unlock
              </Button>
            </div>
            {unlockError && <p className="text-xs text-danger">{unlockError}</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {status === "connected" && (
                <Badge tone="success">
                  <CheckCircle2 size={12} className="mr-1 inline" />
                  Connected{model ? ` (${model})` : ""}
                </Badge>
              )}
              {status === "not_configured" && <Badge tone="neutral">AI not connected</Badge>}
              {status === "error" && (
                <Badge tone="danger">
                  <XCircle size={12} className="mr-1 inline" />
                  Connection error
                </Badge>
              )}
              {status === "idle" && <Badge tone="neutral">Not tested yet</Badge>}
              {status === "testing" && (
                <Badge tone="neutral">
                  <Loader2 size={12} className="mr-1 inline animate-spin" />
                  Testing…
                </Badge>
              )}
            </div>
            {detail && <p className="text-sm text-muted">{detail}</p>}
            <Button size="sm" onClick={testConnection} disabled={status === "testing"}>
              Test connection
            </Button>
          </>
        )}
        <p className="text-xs text-muted">
          The API key lives only in server environment variables (AI_PROVIDER_API_KEY). It is never sent to this browser, stored in
          localStorage, or requested through chat. See .env.example for setup.
        </p>
      </div>
    </Card>
  );
}
