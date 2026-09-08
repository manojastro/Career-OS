"use client";

import { ProfileForm } from "@/components/settings/ProfileForm";
import { AvailabilityForm } from "@/components/settings/AvailabilityForm";
import { AIConnectionPanel } from "@/components/settings/AIConnectionPanel";
import { BackupPanel } from "@/components/settings/BackupPanel";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-muted">Profile defaults, AI connection, and your data.</p>
      </div>
      <ProfileForm />
      <AvailabilityForm />
      <AIConnectionPanel />
      <BackupPanel />
    </div>
  );
}
