import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store/StoreContext";
import { AssistantProvider } from "@/lib/assistant/AssistantContext";
import { AppShell } from "@/components/nav/AppShell";
import { AssistantLauncher } from "@/components/assistant/AssistantLauncher";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { Toaster } from "@/components/ui/Toaster";
import { StartupWarningBanner } from "@/components/nav/StartupWarningBanner";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

export const metadata: Metadata = {
  title: "Career Transition OS",
  description: "Career & Growth Notes — a deployed-proof career blueprint.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <StoreProvider>
          <AssistantProvider>
            <StartupWarningBanner />
            <OnboardingModal />
            <AppShell>{children}</AppShell>
            <AssistantLauncher />
            <AssistantPanel />
            <Toaster />
          </AssistantProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
