"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { useStore } from "@/lib/store/StoreContext";
import { exportBackup, previewImport, applyImport, ImportPreview, STORAGE_KEY } from "@/lib/storage/localStorageAdapter";
import { clearChatHistory } from "@/lib/domain/commands";
import { Card, SectionHeading, Button, Select } from "@/components/ui/Primitives";
import { ConfirmDialog } from "@/components/ui/Drawer";

export function BackupPanel() {
  const { state, replaceState, run, pushToast } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [confirmReplace, setConfirmReplace] = useState(false);

  const storageSizeKb = typeof window !== "undefined" ? Math.round(((window.localStorage.getItem(STORAGE_KEY)?.length ?? 0) * 2) / 1024) : 0;

  function handleExport() {
    const backup = exportBackup(state);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `career-transition-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushToast("success", "Backup downloaded.");
  }

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const p = previewImport(text, state);
      setPreview(p);
      if (!p.valid) pushToast("error", p.error ?? "Invalid backup file.");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function doImport() {
    if (!preview?.parsed) return;
    if (mode === "replace") {
      setConfirmReplace(true);
      return;
    }
    const merged = applyImport(preview.parsed, state, "merge");
    replaceState(merged);
    pushToast("success", "Backup merged in.");
    setPreview(null);
  }

  function confirmReplaceImport() {
    if (!preview?.parsed) return;
    const replaced = applyImport(preview.parsed, state, "replace");
    replaceState(replaced);
    pushToast("success", "Data replaced from backup.");
    setPreview(null);
    setConfirmReplace(false);
  }

  function handleClearChat() {
    run((s) => clearChatHistory(s));
    pushToast("success", "AI chat history cleared.");
  }

  return (
    <Card className="space-y-4">
      <SectionHeading title="Storage & backup" />
      <div className="text-sm text-muted">
        <p>
          Your data lives only in this browser&apos;s local storage (about {storageSizeKb} KB used). It does not sync across devices and can be
          lost if browser data is cleared — export a backup periodically.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleExport}>
          <Download size={14} /> Export backup (.json)
        </Button>
        <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} /> Import backup
        </Button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFilePicked} />
        <Button size="sm" variant="ghost" onClick={handleClearChat}>
          Clear AI chat history
        </Button>
      </div>

      {preview?.valid && preview.counts && (
        <div className="rounded-lg border border-line p-3 text-sm">
          <p className="font-medium text-ink">Import preview</p>
          <ul className="mt-1 space-y-0.5 text-muted">
            {Object.entries(preview.counts).map(([key, c]) => (
              <li key={key}>
                {key}: {c.incoming} incoming ({c.duplicates} would collide with existing records)
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <Select value={mode} onChange={(e) => setMode(e.target.value as "merge" | "replace")} className="w-48">
              <option value="merge">Merge (keep newer of each)</option>
              <option value="replace">Replace everything</option>
            </Select>
            <Button size="sm" onClick={doImport}>
              Apply import
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReplace}
        onCancel={() => setConfirmReplace(false)}
        onConfirm={confirmReplaceImport}
        title="Replace all data?"
        description="This overwrites everything currently stored in this browser with the backup file's contents. This can't be undone."
        confirmLabel="Replace everything"
        danger
      />
    </Card>
  );
}
