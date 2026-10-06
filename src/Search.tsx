import { useEffect, useMemo, useRef, useState } from "react";
import type { AppEntry, FullState } from "./types";
import { IconSearch } from "./Icons";

export function Search({ state }: { state: FullState }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return state.apps.slice(0, 8);
    return state.apps.filter((a) => a.name.toLowerCase().includes(needle)).slice(0, 10);
  }, [q, state.apps]);

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    setActive(0);
  }, [q]);

  const launch = (app?: AppEntry) => {
    const target = app || results[active];
    if (target) window.rice.command("launch", { path: target.path });
  };

  return (
    <div className="panel search" data-hit onKeyDown={(e) => {
      if (e.key === "Escape") window.rice.closeOverlay();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") launch();
    }}>
      <div className="search-field">
        <IconSearch />
        <input
          ref={input}
          value={q}
          placeholder="Search apps"
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <ul className="results">
        {results.length === 0 && <li className="empty">No matches</li>}
        {results.map((app, i) => (
          <li key={app.path + app.name}>
            <button className={i === active ? "on" : ""} onMouseEnter={() => setActive(i)} onClick={() => launch(app)}>
              <span className="app-glyph">{app.name.slice(0, 1)}</span>
              <span>
                <strong>{app.name}</strong>
                <em>{app.path}</em>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="search-hint">Ctrl+Shift+Space · Enter to open · Esc to close</div>
    </div>
  );
}
