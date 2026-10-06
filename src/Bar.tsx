import { useEffect, useState } from "react";
import type { FullState, WidgetId } from "./types";
import markUrl from "../assets/logo/shibui-logo-icon-only.png";
import wordmarkUrl from "../assets/logo/shibui-logo-full.png";
import {
  IconBattery,
  IconEthernet,
  IconGear,
  IconPause,
  IconPlay,
  IconPower,
  IconSearch,
  IconSkip,
  IconSleep,
  IconSpeaker,
  IconWifi,
  IconLock,
} from "./Icons";

type Menu = "sound" | "network" | "power" | "clock" | "media" | "logo" | "stats";

function formatClock(cfg: FullState["config"], d = new Date()) {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: cfg.clockFormat === "12",
    ...(cfg.showSeconds ? { second: "2-digit" as const } : {}),
  };
  return new Intl.DateTimeFormat(undefined, opts).format(d);
}

function formatDate(d = new Date()) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(d);
}

function wifiBars(signal: number): number {
  if (signal >= 70) return 3;
  if (signal >= 35) return 2;
  if (signal > 0) return 1;
  return 0;
}

function speakerLevel(vol: number, muted: boolean): 0 | 1 | 2 | 3 {
  if (muted || vol === 0) return 0;
  if (vol < 35) return 1;
  return 2;
}

function hasTrack(media: FullState["sys"]["media"]) {
  if (!media) return false;
  const status = (media.status || "").toLowerCase();
  if (status !== "playing" && status !== "paused") return false;
  return Boolean(media.title || media.artist);
}

function trackLabel(media: NonNullable<FullState["sys"]["media"]>) {
  if (media.title && media.artist) return `${media.title} - ${media.artist}`;
  return media.title || media.artist;
}

function formatUptime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function openMenu(id: Menu, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  window.rice.command("open-menu", { menu: id, x: rect.left + rect.width / 2 });
}

export function Bar({ state }: { state: FullState }) {
  const { config, sys } = state;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const visible = (id: WidgetId) => {
    if (!config.widgets[id]) return false;
    if (id === "battery" && !sys.battery) return false;
    if (id === "media") return hasTrack(sys.media);
    return true;
  };

  const mediaPlaying = /playing/i.test(sys.media?.status || "");
  const swapMedia = mediaPlaying && visible("media");
  const sideItems = (ids: WidgetId[]) =>
    ids
      .filter((id) => id !== "clock" && visible(id))
      .flatMap((id) => {
        if (id === "media" && swapMedia) return visible("clock") ? (["clock"] as WidgetId[]) : [];
        return [id];
      });
  const left = sideItems(config.orderLeft);
  const right = sideItems(config.orderRight);

  const widget = (id: WidgetId) => {
    switch (id) {
      case "logo":
        return (
          <button className="chip icon mark-btn" title="Shibui" onClick={(e) => openMenu("logo", e.currentTarget)}>
            <img className="mark" src={markUrl} alt="" />
          </button>
        );
      case "activeWindow":
        return (
          <div className="chip app-name" title={sys.window.title || "Desktop"}>
            {sys.window.app || "Desktop"}
          </div>
        );
      case "media":
        if (!hasTrack(sys.media) || !sys.media) return null;
        return (
          <button className="chip media" title={trackLabel(sys.media)} onClick={(e) => openMenu("media", e.currentTarget)}>
            {sys.media.art ? <span className="media-bg" style={{ backgroundImage: `url(data:image/jpeg;base64,${sys.media.art})` }} /> : null}
            <span className="media-eq" data-on={mediaPlaying ? "1" : "0"}>
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="truncate">{trackLabel(sys.media)}</span>
          </button>
        );
      case "sound":
        return (
          <button className="chip icon" title={`Volume ${sys.sound.volume}%`} onClick={(e) => openMenu("sound", e.currentTarget)}>
            <IconSpeaker level={speakerLevel(sys.sound.volume, sys.sound.muted)} />
          </button>
        );
      case "network":
        return (
          <button className="chip icon" title={sys.network.name} onClick={(e) => openMenu("network", e.currentTarget)}>
            {sys.network.kind === "ethernet" ? <IconEthernet /> : <IconWifi bars={wifiBars(sys.network.signal)} />}
          </button>
        );
      case "battery":
        return sys.battery ? (
          <div className="chip icon" title={`${sys.battery.percent}%${sys.battery.charging ? " charging" : ""}`}>
            <IconBattery percent={sys.battery.percent} charging={sys.battery.charging} />
          </div>
        ) : null;
      case "clock":
        return (
          <button className="chip clock" onClick={(e) => openMenu("clock", e.currentTarget)} title={formatDate(now)}>
            <span>{formatClock(config, now)}</span>
          </button>
        );
      case "search":
        return (
          <button className="chip icon" title="Search (Ctrl+Shift+Space)" onClick={() => window.rice.openSearch()}>
            <IconSearch />
          </button>
        );
      case "power":
        return (
          <button className="chip icon" title="Power" onClick={(e) => openMenu("power", e.currentTarget)}>
            <IconPower />
          </button>
        );
      case "settings":
        return (
          <button className="chip icon" title="Dashboard" onClick={() => window.rice.openDashboard()}>
            <IconGear />
          </button>
        );
      case "cpu":
      case "gpu":
      case "ram": {
        const label = id === "cpu" ? "CPU" : id === "gpu" ? "GPU" : "RAM";
        const value = sys.usage?.[id] ?? 0;
        return (
          <button className="chip stat" title={`${label} ${value}%`} onClick={(e) => openMenu("stats", e.currentTarget)}>
            <span className="stat-k">{label}</span>
            <span className="stat-v">{value}%</span>
          </button>
        );
      }
    }
  };

  return (
    <div className="bar-root">
      <div className="bar">
        <div className="cluster">{left.map((id) => <div key={id}>{widget(id)}</div>)}</div>
        <div className="cluster center">
          {swapMedia ? widget("media") : visible("clock") ? widget("clock") : null}
        </div>
        <div className="cluster right">{right.map((id) => <div key={id}>{widget(id)}</div>)}</div>
      </div>
    </div>
  );
}

export function MenuWindow({ state }: { state: FullState }) {
  const { config, sys } = state;
  const [now, setNow] = useState(() => new Date());
  const [name, setName] = useState<Menu>(() => (location.hash.split("/")[1] as Menu) || "logo");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sync = () => setName((location.hash.split("/")[1] as Menu) || "logo");
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const mediaPlaying = /playing/i.test(sys.media?.status || "");
  const openSettings = (url: string) => {
    window.rice.command("open-external", { url });
    window.rice.command("close-menu");
  };
  const mediaArt =
    name === "media" && sys.media?.art
      ? { backgroundImage: `url(data:image/jpeg;base64,${sys.media.art})` }
      : undefined;

  return (
    <div className={`menu menu-pop${name === "media" ? " media-stage" : ""}`} style={mediaArt}>
      {name === "logo" && (
        <>
          <div className="menu-brand"><img className="wordmark" src={wordmarkUrl} alt="Shibui" /></div>
          <button className="menu-item" onClick={() => window.rice.openDashboard()}>Open dashboard…</button>
          <button className="menu-item" onClick={() => window.rice.openSearch()}>Quick search</button>
          <button className="menu-item danger" onClick={() => window.rice.command("quit")}>Quit Shibui</button>
        </>
      )}
      {name === "sound" && (
        <>
          <div className="menu-head">
            <div className="menu-title">Sound</div>
            <button className="gear-btn" title="Sound settings" onClick={() => openSettings("ms-settings:sound")}>
              <IconGear />
            </button>
          </div>
          <div className="volume-row">
            <IconSpeaker level={speakerLevel(sys.sound.volume, sys.sound.muted)} />
            <input
              type="range"
              min={0}
              max={100}
              value={sys.sound.muted ? 0 : sys.sound.volume}
              onChange={(e) => window.rice.command("volume", { value: Number(e.target.value) })}
            />
            <span className="muted">{sys.sound.muted ? "Muted" : `${sys.sound.volume}%`}</span>
          </div>
          <button className="menu-item" onClick={() => window.rice.command("mute")}>
            {sys.sound.muted ? "Unmute" : "Mute"}
          </button>
        </>
      )}
      {name === "network" && (
        <>
          <div className="menu-head">
            <div className="menu-title">Network</div>
            <button
              className="gear-btn"
              title="Network settings"
              onClick={() =>
                openSettings(
                  sys.network.kind === "wifi"
                    ? "ms-settings:network-wifi"
                    : sys.network.kind === "ethernet"
                      ? "ms-settings:network-ethernet"
                      : "ms-settings:network"
                )
              }
            >
              <IconGear />
            </button>
          </div>
          <div className="menu-static">
            <strong>{sys.network.kind === "offline" ? "Not connected" : sys.network.name}</strong>
            <span>{sys.network.kind === "wifi" ? `Wi-Fi · ${sys.network.signal}%` : sys.network.kind === "ethernet" ? "Ethernet" : "No internet"}</span>
          </div>
        </>
      )}
      {name === "clock" && (
        <>
          <div className="big-clock">{formatClock(config, now)}</div>
          <div className="menu-static center">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
        </>
      )}
      {name === "media" && hasTrack(sys.media) && sys.media && (
        <div className="media-scrim">
          <div className="media-copy">
            <strong>{sys.media.title || trackLabel(sys.media)}</strong>
            <span>{sys.media.artist || sys.media.app}</span>
          </div>
          <div className="media-controls">
            <button className="icon-btn" title="Previous" onClick={() => window.rice.command("media", { action: "prev" })}><IconSkip dir={-1} /></button>
            <button className="icon-btn play" title={mediaPlaying ? "Pause" : "Play"} onClick={() => window.rice.command("media", { action: "toggle" })}>
              {mediaPlaying ? <IconPause /> : <IconPlay />}
            </button>
            <button className="icon-btn" title="Next" onClick={() => window.rice.command("media", { action: "next" })}><IconSkip /></button>
          </div>
        </div>
      )}
      {name === "stats" && (
        <>
          <div className="menu-title">Machine</div>
          {(
            [
              ["CPU", sys.usage?.cpu ?? 0],
              ["GPU", sys.usage?.gpu ?? 0],
              ["Memory", sys.usage?.ram ?? 0],
            ] as const
          ).map(([label, value]) => (
            <div className="meter-row" key={label}>
              <div className="meter-label">
                <span>{label}</span>
                <strong>{value}%</strong>
              </div>
              <div className="meter"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
            </div>
          ))}
          <div className="menu-static">
            <span>{sys.usage?.ramUsed ?? 0} / {sys.usage?.ramTotal ?? 0} GB · up {formatUptime(sys.usage?.uptime ?? 0)}</span>
          </div>
        </>
      )}
      {name === "power" && (
        <>
          <div className="menu-title">Power</div>
          <button className="menu-item" onClick={() => window.rice.command("power", { action: "lock" })}><IconLock /> Lock</button>
          <button className="menu-item" onClick={() => window.rice.command("power", { action: "sleep" })}><IconSleep /> Sleep</button>
          <button className="menu-item" onClick={() => window.rice.command("power", { action: "restart" })}>Restart</button>
          <button className="menu-item danger" onClick={() => window.rice.command("power", { action: "shutdown" })}>Shut Down</button>
        </>
      )}
    </div>
  );
}
