const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rice", {
  kind: process.argv.find((a) => a.startsWith("--rice-kind="))?.split("=")[1] || "bar",
  getState: () => ipcRenderer.invoke("state:get"),
  setConfig: (partial) => ipcRenderer.invoke("config:set", partial),
  onState: (cb) => {
    const listener = (_e, state) => cb(state);
    ipcRenderer.on("state", listener);
    return () => ipcRenderer.removeListener("state", listener);
  },
  command: (name, payload) => ipcRenderer.invoke("command", name, payload),
  openDashboard: () => ipcRenderer.invoke("ui:dashboard"),
  openSearch: () => ipcRenderer.invoke("ui:search"),
  closeOverlay: () => ipcRenderer.invoke("ui:close-overlay"),
  finishSetup: (widgets) => ipcRenderer.invoke("setup:finish", widgets),
});
