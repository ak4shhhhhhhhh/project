import { LayoutDashboard, Wifi, Droplets, Activity, Bell, CalendarClock, Bot } from "lucide-react";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export function OverviewPage() {
  return (
    <PagePlaceholder
      icon={LayoutDashboard}
      title="Overview"
      description="A live snapshot of your plant's health — current soil moisture, device connection, pump state, and recent activity."
      highlights={[
        { label: "Live moisture", detail: "Current soil moisture percentage and raw sensor reading from your HW-103 sensor." },
        { label: "Device status", detail: "Online/offline state of your ESP8266 with last-seen timestamp." },
        { label: "Pump state", detail: "Whether the water pump is currently running, idle, or in cooldown." },
        { label: "Moisture chart", detail: "Recent moisture trend over the last hours and days." },
        { label: "Watering events", detail: "A feed of the most recent manual and automatic watering actions." },
        { label: "Latest alerts", detail: "Recent low-moisture or device-offline notifications." },
      ]}
    />
  );
}

export function HistoryPage() {
  return (
    <PagePlaceholder
      icon={Activity}
      title="Sensor History"
      description="Browse and filter historical soil moisture readings with interactive charts. Data is retained for 90 days."
      highlights={[
        { label: "Time range", detail: "Filter by last hour, day, week, or custom range." },
        { label: "Charts", detail: "Moisture percentage and raw value plotted over time." },
        { label: "Export", detail: "Download readings for offline analysis." },
      ]}
    />
  );
}

export function PumpPage() {
  return (
    <PagePlaceholder
      icon={Droplets}
      title="Pump Control"
      description="Manually turn the water pump on or off. Commands are delivered to your device with full status tracking."
      highlights={[
        { label: "On / Off", detail: "Send immediate pump on or off commands with runtime limits." },
        { label: "Command status", detail: "Track pending, received, executed, failed, and expired states." },
        { label: "Safety", detail: "Maximum runtime and cooldown enforced by the Arduino firmware." },
      ]}
    />
  );
}

export function AutomationPage() {
  return (
    <PagePlaceholder
      icon={Bot}
      title="Automation"
      description="Configure automatic watering based on soil moisture thresholds. The Arduino is the single authority for local automation."
      highlights={[
        { label: "Thresholds", detail: "Set moisture percentage that triggers and stops watering." },
        { label: "Safety limits", detail: "Maximum runtime and cooldown between watering cycles." },
        { label: "Sync", detail: "Configuration synchronized to the Arduino over the command channel." },
      ]}
    />
  );
}

export function SchedulesPage() {
  return (
    <PagePlaceholder
      icon={CalendarClock}
      title="Schedules"
      description="Set recurring cloud-side watering schedules. Uses a server-side scheduler in the Asia/Kolkata timezone."
      highlights={[
        { label: "Recurring", detail: "Daily or weekly watering at a fixed time." },
        { label: "Timezone", detail: "Schedules run in Asia/Kolkata by default." },
        { label: "Offline behavior", detail: "Schedules pause during internet outages and resume when reconnected." },
      ]}
    />
  );
}

export function AlertsPage() {
  return (
    <PagePlaceholder
      icon={Bell}
      title="Alerts"
      description="View low-moisture alerts, device-offline warnings, and pump event notifications with full history."
      highlights={[
        { label: "Low moisture", detail: "Triggered when soil drops below your configured threshold." },
        { label: "Device offline", detail: "Alerted when your ESP8266 stops reporting telemetry." },
        { label: "History", detail: "All past alerts retained for review." },
      ]}
    />
  );
}

export function SettingsPage() {
  return (
    <PagePlaceholder
      icon={LayoutDashboard}
      title="Settings"
      description="Manage your device, sensor calibration, and account preferences."
      highlights={[
        { label: "Calibration", detail: "Set air, dry-soil, and moist-soil raw values for your HW-103 sensor." },
        { label: "Device", detail: "Register, view status, and revoke device credentials." },
        { label: "Account", detail: "Update email or change your password." },
      ]}
    />
  );
}
