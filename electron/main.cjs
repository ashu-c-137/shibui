const { app, BrowserWindow, ipcMain, globalShortcut, screen, shell } = require("electron");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const Store = require("electron-store");

const DEFAULT_CONFIG = {
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
};

const store = new Store({ name: "rice-statusbar", defaults: { config: DEFAULT_CONFIG } });

function electronDir() {
  return __dirname.replace(/app\.asar([\\/])/, "app.asar.unpacked$1");
}

const hostPath = path.join(electronDir(), "host.ps1");
const workareaPath = path.join(electronDir(), "workarea.ps1");
const distIndex = path.join(__dirname, "..", "dist", "index.html");

function loginExePath() {
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
}

function useDevServer() {
  return process.env.VITE_DEV_SERVER === "1" || !fs.existsSync(distIndex);
}

function loadWindow(win, kind) {
  if (useDevServer()) {
    win.loadURL(`http://127.0.0.1:5178/#${kind}`);
  } else {
    win.loadFile(distIndex, { hash: kind });
  }
  win.webContents.on("did-finish-load", () => {
    win.webContents.send("state", getFullState());
  });
}

function runPs(script, args) {
  return new Promise((resolve) => {
    const ps = spawn(
      "powershell.exe",
      ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", script, ...args],
      { windowsHide: true }
    );
    let out = "";
    ps.stdout.on("data", (d) => {
      out += d.toString("utf8");
    });
    ps.stderr.on("data", (d) => {
      const msg = d.toString("utf8").trim();
      if (msg) console.error("[rice-ps]", msg);
    });
    ps.on("close", () => {
      const trimmed = out.trim();
      if (!trimmed) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(trimmed));
      } catch {
        resolve({});
      }
    });
  });
}

let hostProc = null;
let hostBuf = "";
let hostBusy = false;
const hostQueue = [];

function ensureHost() {
  if (hostProc && !hostProc.killed) return;
  hostProc = spawn(
    "powershell.exe",
    ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", hostPath, "-SkipPid", String(process.pid), "-Action", "watch"],
    { windowsHide: true }
  );
  hostBuf = "";
  hostProc.stdout.on("data", (d) => {
    hostBuf += d.toString("utf8");
    while (true) {
      const idx = hostBuf.search(/\r?\n/);
      if (idx < 0) break;
      const line = hostBuf.slice(0, idx).trim();
      hostBuf = hostBuf.slice(idx).replace(/^\r?\n/, "");
      const job = hostQueue.shift();
      hostBusy = false;
      if (job) {
        try {
          job.resolve(line ? JSON.parse(line) : {});
        } catch {
          job.resolve({});
        }
      }
      pumpHost();
    }
  });
  hostProc.stderr.on("data", (d) => {
    const msg = d.toString("utf8").trim();
    if (msg) console.error("[rice-ps]", msg);
  });
  hostProc.on("exit", () => {
    hostProc = null;
    hostBusy = false;
    while (hostQueue.length) hostQueue.shift().resolve({});
  });
}

function pumpHost() {
  if (hostBusy || !hostQueue.length || !hostProc) return;
  const next = hostQueue[0];
  hostBusy = true;
  hostProc.stdin.write(`${next.action}|${next.arg1}|${next.arg2}\n`);
}

function runHost(action, arg1 = "", arg2 = "") {
  ensureHost();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const timer = setTimeout(() => stopHost(), 12000);
    hostQueue.push({
      action,
      arg1: String(arg1).replace(/\|/g, " "),
      arg2: String(arg2).replace(/\|/g, " "),
      resolve: (v) => {
        clearTimeout(timer);
        finish(v);
      },
    });
    pumpHost();
  });
}

function stopHost() {
  try {
    if (hostProc) {
      hostProc.stdin.write("quit\n");
      hostProc.kill();
    }
  } catch {
    /* ignore */
  }
  hostProc = null;
}

let barWin;
let dashWin;
let searchWin;
let menuWin;
let setupWin;
let docked = false;
let docking = false;
let coveredStreak = 0;
let clearStreak = 0;
let dockArmed = false;
let sys = {
  window: { title: "", app: "" },
  media: null,
  network: { kind: "offline", name: "Offline", signal: 0 },
  battery: null,
  sound: { volume: 50, muted: false },
  covered: false,
  usage: { cpu: 0, gpu: 0, ram: 0, ramUsed: 0, ramTotal: 0, uptime: 0 },
};
let appsCache = [];
let polling = false;

const WIDGET_IDS = Object.keys(DEFAULT_CONFIG.widgets);

function getConfig() {
  const saved = store.get("config") || {};
  const orderLeft = Array.isArray(saved.orderLeft) ? saved.orderLeft.filter((id) => WIDGET_IDS.includes(id)) : [...DEFAULT_CONFIG.orderLeft];
  const orderRight = Array.isArray(saved.orderRight) ? saved.orderRight.filter((id) => WIDGET_IDS.includes(id)) : [...DEFAULT_CONFIG.orderRight];
  for (const id of WIDGET_IDS) {
    if (!orderLeft.includes(id) && !orderRight.includes(id)) {
      const at = orderRight.indexOf("media");
      orderRight.splice(at >= 0 ? at : orderRight.length, 0, id);
    }
  }
  const setupDone = typeof saved.setupDone === "boolean" ? saved.setupDone : fs.existsSync(store.path);
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    orderLeft,
    orderRight,
    setupDone,
    widgets: { ...DEFAULT_CONFIG.widgets, ...(saved.widgets || {}) },
  };
}

function applyInstallerChoices() {
  const file = path.join(app.getPath("userData"), "installer-widgets.json");
  if (!fs.existsSync(file)) return;
  try {
    const picked = JSON.parse(fs.readFileSync(file, "utf8"));
    const widgets = { ...getConfig().widgets };
    for (const id of WIDGET_IDS) {
      if (typeof picked[id] === "boolean") widgets[id] = picked[id];
    }
    store.set("config", { ...getConfig(), widgets, setupDone: true });
  } catch {
    /* keep defaults */
  }
  fs.unlink(file, () => {});
}

function getFullState() {
  return { config: getConfig(), sys, apps: appsCache };
}

function broadcast() {
  const state = getFullState();
  for (const win of [barWin, dashWin, searchWin, menuWin, setupWin]) {
    if (win && !win.isDestroyed()) win.webContents.send("state", state);
  }
}

async function tick() {
  if (polling) return;
  polling = true;
  try {
    const next = await runHost("poll");
    if (next && (next.window || next.sound || next.network || next.usage || next.media !== undefined)) {
      sys = {
        window: next.window || sys.window,
        media: next.media ?? null,
        network: next.network || sys.network,
        battery: next.battery ?? null,
        sound: next.sound || sys.sound,
        covered: Boolean(next.covered),
        usage: next.usage || sys.usage,
      };
      broadcast();
      syncDock(sys.covered);
    }
  } finally {
    polling = false;
  }
}

async function refreshApps() {
  const res = await runHost("apps");
  if (Array.isArray(res.apps)) appsCache = res.apps;
}

function barStrip() {
  const display = screen.getPrimaryDisplay();
  const { x, y, width } = display.bounds;
  return { x, y, width, height: Math.max(getConfig().barHeight, 28), display };
}

function hwndOf(win) {
  const buf = win.getNativeWindowHandle();
  if (buf.length >= 8) return buf.readBigUInt64LE(0).toString();
  return buf.readUInt32LE(0).toString();
}

function createBar() {
  const strip = barStrip();
  barWin = new BrowserWindow({
    x: strip.x,
    y: strip.y,
    width: strip.width,
    height: strip.height,
    show: false,
    frame: false,
    transparent: false,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    focusable: false,
    hasShadow: false,
    roundedCorners: false,
    alwaysOnTop: true,
    backgroundColor: "#202020",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: ["--rice-kind=bar"],
    },
  });
  barWin.setAlwaysOnTop(true, "screen-saver");
  barWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  loadWindow(barWin, "bar");
  barWin.on("closed", () => {
    barWin = null;
    setWorkArea("restore");
    app.quit();
  });
}

function createSetup() {
  if (setupWin && !setupWin.isDestroyed()) {
    setupWin.show();
    setupWin.focus();
    return;
  }
  setupWin = new BrowserWindow({
    width: 760,
    height: 680,
    show: true,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    center: true,
    backgroundColor: "#141414",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: ["--rice-kind=setup"],
    },
  });
  loadWindow(setupWin, "setup");
  setupWin.on("closed", () => {
    setupWin = null;
    if (!quitting && !getConfig().setupDone) app.quit();
  });
}

function createDash() {
  if (dashWin && !dashWin.isDestroyed()) {
    dashWin.show();
    dashWin.focus();
    return;
  }
  const display = screen.getPrimaryDisplay();
  dashWin = new BrowserWindow({
    width: 560,
    height: 640,
    x: Math.round(display.workArea.x + (display.workArea.width - 560) / 2),
    y: Math.round(display.workArea.y + (display.workArea.height - 640) / 2),
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    alwaysOnTop: true,
    hasShadow: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: ["--rice-kind=dashboard"],
    },
  });
  dashWin.setAlwaysOnTop(true, "pop-up-menu");
  bindEscape(dashWin);
  loadWindow(dashWin, "dashboard");
  dashWin.on("closed", () => {
    dashWin = null;
  });
}

function createSearch() {
  if (searchWin && !searchWin.isDestroyed()) {
    searchWin.show();
    searchWin.focus();
    return;
  }
  const display = screen.getPrimaryDisplay();
  searchWin = new BrowserWindow({
    width: 640,
    height: 420,
    x: Math.round(display.workArea.x + (display.workArea.width - 640) / 2),
    y: Math.round(display.workArea.y + display.workArea.height * 0.18),
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    alwaysOnTop: true,
    hasShadow: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: ["--rice-kind=search"],
    },
  });
  searchWin.setAlwaysOnTop(true, "pop-up-menu");
  bindEscape(searchWin);
  loadWindow(searchWin, "search");
  searchWin.on("closed", () => {
    searchWin = null;
  });
}

function bindEscape(win) {
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown" || input.key !== "Escape") return;
    event.preventDefault();
    if (!win.isDestroyed()) win.close();
  });
}

function closeMenu() {
  if (menuWin && !menuWin.isDestroyed()) menuWin.close();
  menuWin = null;
}

async function setWorkArea(action) {
  const strip = barStrip();
  const hwnd = barWin && !barWin.isDestroyed() ? hwndOf(barWin) : "0";
  const rect = await runPs(workareaPath, [
    "-Action", action,
    "-Height", String(strip.height),
    "-Hwnd", hwnd,
    "-Left", String(strip.display.bounds.x),
    "-Top", String(strip.display.bounds.y),
    "-Right", String(strip.display.bounds.x + strip.display.bounds.width),
    "-Bottom", String(strip.display.bounds.y + strip.display.bounds.height),
  ]);
  if (action === "reserve" && rect && Number.isFinite(rect.right) && barWin && !barWin.isDestroyed()) {
    barWin.setBounds({
      x: rect.left,
      y: rect.top,
      width: Math.max(1, rect.right - rect.left),
      height: Math.max(strip.height, rect.bottom - rect.top),
    });
    barWin.setAlwaysOnTop(true, "screen-saver");
  }
  return rect;
}

function syncDock(covered) {
  if (!barWin || barWin.isDestroyed() || docking) return;
  if (covered) {
    coveredStreak += 1;
    clearStreak = 0;
  } else {
    clearStreak += 1;
    coveredStreak = 0;
  }
  if (!dockArmed) {
    dockArmed = true;
    clearStreak = covered ? 0 : 2;
    coveredStreak = 0;
  }
  // Require two consistent polls so a window-open animation cannot hide and
  // redock the bar (that resize is what flashes the strip).
  if (coveredStreak >= 2 && docked) {
    coveredStreak = 0;
    docking = true;
    docked = false;
    closeMenu();
    setWorkArea("restore").finally(() => {
      if (barWin && !barWin.isDestroyed()) barWin.hide();
      docking = false;
    });
    return;
  }
  if (clearStreak >= 2 && !docked) {
    clearStreak = 0;
    docking = true;
    docked = true;
    const strip = barStrip();
    const bounds = barWin.getBounds();
    const same =
      bounds.x === strip.x &&
      bounds.y === strip.y &&
      bounds.width === strip.width &&
      bounds.height === strip.height;
    if (!same) barWin.setBounds({ x: strip.x, y: strip.y, width: strip.width, height: strip.height });
    if (!barWin.isVisible()) barWin.showInactive();
    barWin.setAlwaysOnTop(true, "screen-saver");
    setWorkArea("reserve").finally(() => {
      docking = false;
    });
  }
}

function openMenu(name, centerX) {
  if (!docked || !barWin || barWin.isDestroyed()) return;
  const width = name === "media" ? 300 : 260;
  const height = name === "clock" ? 148 : name === "power" ? 250 : name === "media" ? 360 : name === "stats" ? 236 : name === "logo" ? 320 : 210;
  const strip = barStrip();
  let x = Math.round(centerX - width / 2);
  const maxX = strip.display.bounds.x + strip.display.bounds.width - width - 8;
  x = Math.max(strip.display.bounds.x + 8, Math.min(x, maxX));
  const y = strip.y + strip.height + 6;
  if (menuWin && !menuWin.isDestroyed()) {
    menuWin.setBounds({ x, y, width, height });
    menuWin.show();
    menuWin.focus();
    menuWin.webContents.executeJavaScript(`location.hash = ${JSON.stringify(`menu/${name}`)}`);
    menuWin.webContents.send("state", getFullState());
    return;
  }
  menuWin = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: ["--rice-kind=menu"],
    },
  });
  menuWin.setAlwaysOnTop(true, "pop-up-menu");
  bindEscape(menuWin);
  loadWindow(menuWin, `menu/${name}`);
  menuWin.webContents.once("did-finish-load", () => {
    setTimeout(() => {
      if (menuWin && !menuWin.isDestroyed()) menuWin.on("blur", () => closeMenu());
    }, 250);
  });
  menuWin.on("closed", () => {
    menuWin = null;
  });
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.exit(0);
}

app.on("second-instance", () => {
  if (barWin && !barWin.isDestroyed() && !barWin.isVisible()) barWin.showInactive();
});

app.whenReady().then(async () => {
  app.setAppUserModelId("shibui.bar");
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: loginExePath(),
    });
  }
  applyInstallerChoices();
  if (getConfig().setupDone) createBar();
  else createSetup();
  tick();
  setInterval(tick, 1000);
  refreshApps();
  setInterval(refreshApps, 120000);

  const ok = globalShortcut.register("Control+Shift+Space", () => createSearch());
  if (!ok) globalShortcut.register("Alt+Shift+Space", () => createSearch());
});

let quitting = false;
app.on("before-quit", (e) => {
  if (quitting) return;
  e.preventDefault();
  quitting = true;
  globalShortcut.unregisterAll();
  stopHost();
  setWorkArea("restore").finally(() => app.quit());
});

app.on("window-all-closed", () => {
  if (!quitting) app.quit();
});

ipcMain.handle("state:get", () => getFullState());

ipcMain.handle("config:set", (_e, partial) => {
  const next = { ...getConfig(), ...partial };
  if (partial.widgets) next.widgets = { ...getConfig().widgets, ...partial.widgets };
  store.set("config", next);
  if (partial.barHeight && barWin && !barWin.isDestroyed() && docked) {
    const strip = barStrip();
    barWin.setBounds({ x: strip.x, y: strip.y, width: strip.width, height: strip.height });
    setWorkArea("reserve");
  }
  if (partial.theme && barWin && !barWin.isDestroyed()) {
    barWin.setBackgroundColor(partial.theme === "light" ? "#f3f3f3" : "#202020");
  }
  broadcast();
  return next;
});

ipcMain.handle("ui:dashboard", () => {
  createDash();
});

ipcMain.handle("ui:search", () => {
  createSearch();
});

ipcMain.handle("setup:finish", (_e, widgets = {}) => {
  const current = getConfig();
  const nextWidgets = { ...current.widgets };
  for (const id of WIDGET_IDS) {
    if (typeof widgets[id] === "boolean") nextWidgets[id] = widgets[id];
  }
  const next = { ...current, widgets: nextWidgets, setupDone: true };
  store.set("config", next);
  if (!barWin || barWin.isDestroyed()) createBar();
  if (setupWin && !setupWin.isDestroyed()) setupWin.close();
  broadcast();
  return next;
});

ipcMain.handle("ui:close-overlay", (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win && win !== barWin) win.close();
});

ipcMain.handle("command", async (e, name, payload = {}) => {
  switch (name) {
    case "open-menu": {
      const bounds = barWin && !barWin.isDestroyed() ? barWin.getBounds() : { x: 0 };
      openMenu(String(payload.menu || "logo"), bounds.x + Number(payload.x || 0));
      return { ok: true };
    }
    case "close-menu": {
      closeMenu();
      return { ok: true };
    }
    case "volume": {
      const v = Math.max(0, Math.min(100, Number(payload.value) || 0));
      sys.sound = { ...sys.sound, volume: v };
      broadcast();
      await runHost("volume", String(v / 100));
      return { ok: true };
    }
    case "mute": {
      const res = await runHost("mute");
      if (typeof res.muted === "boolean") sys.sound = { ...sys.sound, muted: res.muted };
      broadcast();
      return res;
    }
    case "media": {
      await runHost("media", String(payload.action || "toggle"));
      setTimeout(tick, 200);
      return { ok: true };
    }
    case "power": {
      await runHost("power", String(payload.action || "lock"));
      return { ok: true };
    }
    case "launch": {
      const p = String(payload.path || "");
      if (p) await runHost("launch", p);
      if (searchWin && !searchWin.isDestroyed()) searchWin.close();
      return { ok: true };
    }
    case "search": {
      const q = String(payload.query || "").toLowerCase();
      const apps = appsCache
        .filter((a) => a.name && a.name.toLowerCase().includes(q))
        .slice(0, 12);
      return { apps };
    }
    case "open-external": {
      if (payload.url) await shell.openExternal(payload.url);
      return { ok: true };
    }
    case "reload-bar": {
      closeMenu();
      if (barWin && !barWin.isDestroyed()) {
        barWin.webContents.reload();
        setTimeout(() => {
          tick();
          if (docked) setWorkArea("reserve");
        }, 400);
      }
      return { ok: true };
    }
    case "quit": {
      setWorkArea("restore");
      app.quit();
      return { ok: true };
    }
    default:
      return { ok: false };
  }
});
