"use client";

import { useState } from "react";
import { useStore } from "@/lib/store/StoreContext";
import { updateProfile } from "@/lib/domain/commands";
import { Card, Input, Textarea, Select, SectionHeading } from "@/components/ui/Primitives";
import { RoleId, ROLE_LABELS } from "@/lib/schema";

export function ProfileForm() {
  const { state, run } = useStore();
  const p = state.profile;
  const [name, setName] = useState(p.name);
  const [background, setBackground] = useState(p.background);
  const [totalYears, setTotalYears] = useState(p.totalYearsExperience);
  const [aiYears, setAiYears] = useState(p.aiYearsExperience);
  const [currentComp, setCurrentComp] = useState(p.currentCompensationLPA);
  const [targetMin, setTargetMin] = useState(p.targetCompensationMinLPA);
  const [targetMax, setTargetMax] = useState(p.targetCompensationMaxLPA);
  const [horizon, setHorizon] = useState(p.planningHorizonDays);
  const [startDate, setStartDate] = useState(p.planStartDate);
  const [locationsText, setLocationsText] = useState(p.preferredLocations.join(", "));
  const [portfolioLimit, setPortfolioLimit] = useState(p.portfolioLimit);
  const [primaryRole, setPrimaryRole] = useState(p.primaryRole);
  const [secondaryRole, setSecondaryRole] = useState<string>(p.secondaryRole ?? "");

  function save() {
    run((s) =>
      updateProfile(
        s,
        {
          name,
          background,
          totalYearsExperience: Number(totalYears),
          aiYearsExperience: Number(aiYears),
          currentCompensationLPA: Number(currentComp),
          targetCompensationMinLPA: Number(targetMin),
          targetCompensationMaxLPA: Number(targetMax),
          planningHorizonDays: Number(horizon),
          planStartDate: startDate,
          preferredLocations: locationsText.split(",").map((x) => x.trim()).filter(Boolean),
          portfolioLimit: Number(portfolioLimit),
          primaryRole,
          secondaryRole: secondaryRole ? (secondaryRole as RoleId) : null,
        },
        { actor: "user" }
      )
    );
  }

  return (
    <Card className="space-y-4">
      <SectionHeading title="Profile & goals" subtitle="Your personal defaults. Nothing here is shared beyond this device unless you export it." />
      <Input label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} onBlur={save} />
      <Textarea label="Background" value={background} onChange={(e) => setBackground(e.target.value)} onBlur={save} rows={2} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Total years of experience" type="number" step="0.1" value={totalYears} onChange={(e) => setTotalYears(Number(e.target.value))} onBlur={save} />
        <Input label="Years of AI-specific experience" type="number" step="0.1" value={aiYears} onChange={(e) => setAiYears(Number(e.target.value))} onBlur={save} hint="Kept separate so it never implies full years of AI experience." />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input label="Current compensation (LPA, private)" type="number" value={currentComp} onChange={(e) => setCurrentComp(Number(e.target.value))} onBlur={save} />
        <Input label="Target compensation min (LPA)" type="number" value={targetMin} onChange={(e) => setTargetMin(Number(e.target.value))} onBlur={save} />
        <Input label="Target compensation max (LPA)" type="number" value={targetMax} onChange={(e) => setTargetMax(Number(e.target.value))} onBlur={save} />
      </div>
      <p className="text-xs text-muted">Target compensation is a personal aspiration, not a guaranteed outcome.</p>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Planning horizon (days)" type="number" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} onBlur={save} />
        <Input label="Plan start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} onBlur={save} />
      </div>
      <Input label="Preferred locations (comma separated)" value={locationsText} onChange={(e) => setLocationsText(e.target.value)} onBlur={save} />
      <Input label="Portfolio limit (active projects)" type="number" min={1} value={portfolioLimit} onChange={(e) => setPortfolioLimit(Number(e.target.value))} onBlur={save} />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Primary target role"
          value={primaryRole}
          onChange={(e) => {
            const v = e.target.value as RoleId;
            setPrimaryRole(v);
            run((s) => updateProfile(s, { primaryRole: v }, { actor: "user" }));
          }}
        >
          {(Object.keys(ROLE_LABELS) as RoleId[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <Select
          label="Secondary target role (optional)"
          value={secondaryRole}
          onChange={(e) => {
            const v = e.target.value;
            setSecondaryRole(v);
            run((s) => updateProfile(s, { secondaryRole: v ? (v as RoleId) : null }, { actor: "user" }));
          }}
        >
          <option value="">None</option>
          {(Object.keys(ROLE_LABELS) as RoleId[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>
      <p className="text-xs text-muted">Timezone is fixed to Asia/Kolkata for date resolution across the portal.</p>
    </Card>
  );
}
