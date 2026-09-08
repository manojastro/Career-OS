"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store/StoreContext";
import { Button, EmptyState, SectionHeading, Card } from "@/components/ui/Primitives";
import { cx } from "@/lib/utils";
import { AddJobModal } from "@/components/shared/AddJobModal";
import { JobCard } from "@/components/opportunities/JobCard";
import { JobDetailDrawer } from "@/components/opportunities/JobDetailDrawer";
import { MasterProfileEditor } from "@/components/opportunities/MasterProfileEditor";
import { ResumeVersionsPanel } from "@/components/opportunities/ResumeVersionsPanel";
import { InterviewCard } from "@/components/opportunities/InterviewCard";
import { InterviewDrawer } from "@/components/opportunities/InterviewDrawer";
import { ContactCard } from "@/components/opportunities/ContactCard";
import { ContactDrawer } from "@/components/opportunities/ContactDrawer";
import { Job, Interview, Contact } from "@/lib/schema";
import { todayISO } from "@/lib/dateTime";

type Tab = "jobs" | "resume" | "interviews" | "people";

export default function OpportunitiesPage() {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>("jobs");
  const today = todayISO();

  const [addJobOpen, setAddJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | undefined>(undefined);

  const [interviewDrawerOpen, setInterviewDrawerOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | undefined>(undefined);

  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);

  const sortedJobs = useMemo(
    () =>
      [...state.jobs].sort((a, b) => {
        const aUrgent = a.followUpDate ?? "9999";
        const bUrgent = b.followUpDate ?? "9999";
        if (aUrgent !== bUrgent) return aUrgent < bUrgent ? -1 : 1;
        return a.savedAt < b.savedAt ? 1 : -1;
      }),
    [state.jobs]
  );

  const upcomingFollowUps = useMemo(
    () => state.contacts.filter((c) => c.followUpDate).sort((a, b) => (a.followUpDate! < b.followUpDate! ? -1 : 1)),
    [state.contacts]
  );
  const topFollowUp = upcomingFollowUps[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink">Opportunities</h1>
        <p className="text-sm text-muted">Jobs, resume versions, interview prep, and your network — all connected.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {(["jobs", "resume", "interviews", "people"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium capitalize",
              tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "jobs" && (
        <div className="space-y-4">
          <SectionHeading
            title={`Saved jobs (${state.jobs.length})`}
            subtitle="Paste a JD to see what's matched, partial, missing, and unknown."
            action={
              <Button onClick={() => setAddJobOpen(true)}>
                <Plus size={16} /> Save a job
              </Button>
            }
          />
          {sortedJobs.length === 0 ? (
            <EmptyState title="No jobs saved yet" description="Paste a job description to compare it against your profile." action={<Button onClick={() => setAddJobOpen(true)}>Save your first job</Button>} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sortedJobs.map((j) => (
                <JobCard key={j.id} job={j} onOpen={() => setSelectedJob(j)} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "resume" && (
        <div className="space-y-6">
          <MasterProfileEditor />
          <ResumeVersionsPanel />
        </div>
      )}

      {tab === "interviews" && (
        <div className="space-y-4">
          <SectionHeading
            title={`Interviews (${state.interviews.length})`}
            action={
              <Button onClick={() => setInterviewDrawerOpen(true)}>
                <Plus size={16} /> Schedule interview
              </Button>
            }
          />
          {state.interviews.length === 0 ? (
            <EmptyState title="No interviews logged yet" description="Schedule one to generate a preparation checklist." action={<Button onClick={() => setInterviewDrawerOpen(true)}>Schedule your first</Button>} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {state.interviews.map((iv) => (
                <InterviewCard key={iv.id} interview={iv} onOpen={() => setSelectedInterview(iv)} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "people" && (
        <div className="space-y-4">
          <SectionHeading
            title={`Contacts (${state.contacts.length})`}
            action={
              <Button onClick={() => setContactDrawerOpen(true)}>
                <Plus size={16} /> Add contact
              </Button>
            }
          />
          {topFollowUp && (
            <Card className="border-accent/30 bg-accentSoft/40">
              <p className="text-sm text-ink">
                Follow up with <span className="font-medium">{topFollowUp.name}</span>
                {topFollowUp.followUpDate! < today ? " — overdue" : topFollowUp.followUpDate === today ? " — today" : ` on ${topFollowUp.followUpDate}`}.
              </p>
            </Card>
          )}
          {state.contacts.length === 0 ? (
            <EmptyState
              title="No contacts saved yet"
              description="Add people you've actually connected with — the assistant won't invent contacts or referrals for you."
              action={<Button onClick={() => setContactDrawerOpen(true)}>Add your first contact</Button>}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {state.contacts.map((c) => (
                <ContactCard key={c.id} contact={c} onOpen={() => setSelectedContact(c)} />
              ))}
            </div>
          )}
        </div>
      )}

      <AddJobModal open={addJobOpen} onClose={() => setAddJobOpen(false)} />
      <JobDetailDrawer key={selectedJob?.id ?? "none"} open={Boolean(selectedJob)} onClose={() => setSelectedJob(undefined)} job={selectedJob} />
      <InterviewDrawer key={selectedInterview?.id ?? "new-interview"} open={interviewDrawerOpen || Boolean(selectedInterview)} onClose={() => { setInterviewDrawerOpen(false); setSelectedInterview(undefined); }} interview={selectedInterview} />
      <ContactDrawer key={selectedContact?.id ?? "new-contact"} open={contactDrawerOpen || Boolean(selectedContact)} onClose={() => { setContactDrawerOpen(false); setSelectedContact(undefined); }} contact={selectedContact} />
    </div>
  );
}
