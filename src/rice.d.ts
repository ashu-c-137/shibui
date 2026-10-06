import type { FullState } from "./types";

export {};

declare global {
  interface Window {
    rice: {
      kind: string;
      getState: () => Promise<FullState>;
      setConfig: (partial: Record<string, unknown>) => Promise<unknown>;
      onState: (cb: (state: FullState) => void) => () => void;
      command: (name: string, payload?: Record<string, unknown>) => Promise<unknown>;
      openDashboard: () => Promise<void>;
      openSearch: () => Promise<void>;
      closeOverlay: () => Promise<void>;
      finishSetup: (widgets: Record<string, boolean>) => Promise<unknown>;
    };
  }
}
