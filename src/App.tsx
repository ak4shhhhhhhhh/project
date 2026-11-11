import { useState } from "react";
import { AuthProvider } from "@/auth/AuthContext";
import { RequireAuth } from "@/auth/RequireAuth";
import { AppLayout } from "@/app/AppLayout";
import type { SectionId } from "@/app/navigation";
import {
  OverviewPage,
  HistoryPage,
  PumpPage,
  AutomationPage,
  SchedulesPage,
  AlertsPage,
  SettingsPage,
} from "@/pages/sectionPages";

const VALID_SECTIONS: SectionId[] = [
  "overview",
  "history",
  "pump",
  "automation",
  "schedules",
  "alerts",
  "settings",
];

function getInitialSection(): SectionId {
  const hash = window.location.hash.replace("#", "") as SectionId;
  return VALID_SECTIONS.includes(hash) ? hash : "overview";
}

function App() {
  const [section, setSection] = useState<SectionId>(getInitialSection);

  function handleNavigate(id: SectionId) {
    setSection(id);
    window.location.hash = id;
  }

  return (
    <AuthProvider>
      <RequireAuth>
        <AppLayout active={section} onNavigate={handleNavigate}>
          {section === "overview" && <OverviewPage />}
          {section === "history" && <HistoryPage />}
          {section === "pump" && <PumpPage />}
          {section === "automation" && <AutomationPage />}
          {section === "schedules" && <SchedulesPage />}
          {section === "alerts" && <AlertsPage />}
          {section === "settings" && <SettingsPage />}
        </AppLayout>
      </RequireAuth>
    </AuthProvider>
  );
}

export default App;
