import {
  LayoutDashboard,
  LineChart,
  Droplets,
  Bot,
  CalendarClock,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type SectionId =
  | "overview"
  | "history"
  | "pump"
  | "automation"
  | "schedules"
  | "alerts"
  | "settings";

export interface NavItem {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, description: "Live status of your plant and device" },
  { id: "history", label: "Sensor History", icon: LineChart, description: "Historical moisture readings and charts" },
  { id: "pump", label: "Pump Control", icon: Droplets, description: "Manual water pump on/off control" },
  { id: "automation", label: "Automation", icon: Bot, description: "Moisture threshold automatic watering" },
  { id: "schedules", label: "Schedules", icon: CalendarClock, description: "Recurring watering schedules" },
  { id: "alerts", label: "Alerts", icon: Bell, description: "Notifications and event history" },
  { id: "settings", label: "Settings", icon: Settings, description: "Device, calibration and account settings" },
];
