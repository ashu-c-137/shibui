import { useState } from "react";
import { WIDGET_META, type FullState, type WidgetId } from "./types";
import wordmarkUrl from "../assets/logo/shibui-logo-full.png";

const GROUPS: { title: string; ids: WidgetId[] }[] = [
  { title: "Bar", ids: ["logo", "activeWindow", "clock"] },
  { title: "Status", ids: ["media", "sound", "network", "battery"] },
  { title: "Machine", ids: ["cpu", "gpu", "ram"] },
  { title: "Tools", ids: ["search", "power", "settings"] },
];

export function Setup({ state }: { state: FullState }) {
  const [picked, setPicked] = useState<Record<WidgetId, boolean>>({ ...state.config.widgets });

  const toggle = (id: WidgetId) => setPicked((cur) => ({ ...cur, [id]: !cur[id] }));

  return (
    <div className="setup">
      <img className="wordmark setup-mark" src={wordmarkUrl} alt="Shibui" />
      <p className="setup-kana">渋い</p>
      <p className="setup-lead">Choose what sits on the bar. You can change this later from the dashboard.</p>
      <div className="setup-grid">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2>{group.title}</h2>
            {group.ids.map((id) => {
              const meta = WIDGET_META.find((w) => w.id === id);
              if (!meta) return null;
              return (
                <label key={id} className="widget-row">
                  <input type="checkbox" checked={picked[id]} onChange={() => toggle(id)} />
                  <span className="widget-copy">
                    <strong>{meta.label}</strong>
                    <em>{meta.hint}</em>
                  </span>
                </label>
              );
            })}
          </section>
        ))}
      </div>
      <button className="setup-go" onClick={() => window.rice.finishSetup(picked)}>
        Start Shibui
      </button>
    </div>
  );
}
