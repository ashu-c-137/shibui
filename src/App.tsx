import { useEffect, useState } from "react";
import type { FullState } from "./types";
import { Bar, MenuWindow } from "./Bar";
import { Dashboard } from "./Dashboard";
import { Search } from "./Search";
import { Setup } from "./Setup";

const empty: FullState = {
  config: {
    widgets: {
      logo: true,
      activeWindow: true,
      media: true,
      sound: true,
      network: true,
      battery: true,
      clock: true,
      search: true,
      power: true,
      settings: true,
      cpu: true,
      gpu: true,
      ram: true,
    },
    orderLeft: ["logo", "activeWindow"],
    orderRight: ["cpu", "gpu", "ram", "media", "sound", "network", "battery", "clock", "search", "power", "settings"],
    clockFormat: "12",
    showSeconds: false,
    theme: "dark",
    accent: "#0A84FF",
    barHeight: 32,
    setupDone: false,
  },
  sys: {
    window: { title: "", app: "" },
    media: null,
    network: { kind: "offline", name: "Offline", signal: 0 },
    battery: null,
    sound: { volume: 50, muted: false },
    covered: false,
    usage: { cpu: 0, gpu: 0, ram: 0, ramUsed: 0, ramTotal: 0, uptime: 0 },
  },
  apps: [],
};

function kindFromArgv(): "bar" | "dashboard" | "search" | "menu" | "setup" {
  const hash = location.hash.replace(/^#\/?/, "");
  if (hash.startsWith("menu") || window.rice?.kind === "menu") return "menu";
  const fromApi = window.rice?.kind;
  if (fromApi === "dashboard" || fromApi === "search" || fromApi === "bar" || fromApi === "setup") return fromApi;
  if (hash === "dashboard" || hash === "search" || hash === "setup") return hash;
  return "bar";
}

export function App() {
  const [state, setState] = useState<FullState>(empty);
  const kind = kindFromArgv();

  useEffect(() => {
    document.documentElement.dataset.kind = kind;
    window.rice.getState().then(setState);
    return window.rice.onState(setState);
  }, [kind]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.config.theme;
    document.documentElement.style.setProperty("--accent", state.config.accent);
    document.documentElement.style.setProperty("--bar-h", `${state.config.barHeight}px`);
  }, [state.config]);

  useEffect(() => {
    if (kind === "bar" || kind === "setup") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.rice.closeOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kind]);

  if (kind === "setup") return <Setup state={state} />;
  if (kind === "dashboard") return <Dashboard state={state} />;
  if (kind === "search") return <Search state={state} />;
  if (kind === "menu") return <MenuWindow state={state} />;
  return <Bar state={state} />;
}
