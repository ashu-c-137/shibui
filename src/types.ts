export type WidgetId =
  | "logo"
  | "activeWindow"
  | "media"
  | "sound"
  | "network"
  | "battery"
  | "clock"
  | "search"
  | "power"
  | "settings"
  | "cpu"
  | "gpu"
  | "ram";

export type Config = {
  widgets: Record<WidgetId, boolean>;
  orderLeft: WidgetId[];
  orderRight: WidgetId[];
  clockFormat: "12" | "24";
  showSeconds: boolean;
  theme: "dark" | "light";
  accent: string;
  barHeight: number;
  setupDone: boolean;
};

export type SysState = {
  window: { title: string; app: string };
  media: { title: string; artist: string; app: string; status: string; art?: string } | null;
  network: { kind: "wifi" | "ethernet" | "offline"; name: string; signal: number };
  battery: { percent: number; charging: boolean } | null;
  sound: { volume: number; muted: boolean };
  covered: boolean;
  usage: { cpu: number; gpu: number; ram: number; ramUsed: number; ramTotal: number; uptime: number };
};

export type AppEntry = { name: string; path: string; shortcut?: string };

export type FullState = {
  config: Config;
  sys: SysState;
  apps: AppEntry[];
};

export const WIDGET_META: { id: WidgetId; label: string; hint: string }[] = [
  { id: "logo", label: "Shibui", hint: "Left-side identity button" },
  { id: "activeWindow", label: "Current window", hint: "Foreground app name" },
  { id: "media", label: "Now playing", hint: "Title, artist, play/pause" },
  { id: "sound", label: "Sound", hint: "Volume and mute" },
  { id: "network", label: "Network", hint: "Wi-Fi or Ethernet status" },
  { id: "battery", label: "Battery", hint: "Hidden on desktops without a battery" },
  { id: "clock", label: "Time", hint: "Clock and date" },
  { id: "search", label: "Quick search", hint: "Spotlight-style app launcher" },
  { id: "power", label: "Power", hint: "Sleep, restart, shut down, lock" },
  { id: "settings", label: "Dashboard", hint: "Open this customization panel" },
  { id: "cpu", label: "CPU", hint: "Processor use" },
  { id: "gpu", label: "GPU", hint: "Graphics use" },
  { id: "ram", label: "Memory", hint: "RAM in use" },
];
