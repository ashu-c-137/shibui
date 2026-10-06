import { WIDGET_META, type FullState, type WidgetId } from "./types";
import wordmarkUrl from "../assets/logo/shibui-logo-full.png";

const ACCENTS = ["#0A84FF", "#30D158", "#FF9F0A", "#FF453A", "#BF5AF2", "#64D2FF", "#FF375F"];

export function Dashboard({ state }: { state: FullState }) {
  const { config } = state;

  const toggle = (id: WidgetId) => {
    window.rice.setConfig({ widgets: { [id]: !config.widgets[id] } });
  };

  const move = (side: "orderLeft" | "orderRight", id: WidgetId, dir: -1 | 1) => {
    const list = [...config[side]];
    const i = list.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    window.rice.setConfig({ [side]: list });
  };

  return (
    <div className="panel dash" data-hit>
      <header className="panel-bar">
        <div className="traffic">
          <button className="dot close" onClick={() => window.rice.closeOverlay()} aria-label="Close" />
        </div>
        <h1><img className="wordmark dash-mark" src={wordmarkUrl} alt="Shibui" /></h1>
      </header>

      <div className="panel-body">
        <section>
          <h2>Widgets</h2>
          <p className="hint">Show or hide items on the menu bar. Drag order with the arrows.</p>
          <div className="widget-list">
            {WIDGET_META.map((w) => (
              <label key={w.id} className="widget-row">
                <input type="checkbox" checked={config.widgets[w.id]} onChange={() => toggle(w.id)} />
                <span className="widget-copy">
                  <strong>{w.label}</strong>
                  <em>{w.hint}</em>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2>Order</h2>
          <div className="order-cols">
            <OrderList title="Left" ids={config.orderLeft} onMove={(id, d) => move("orderLeft", id, d)} />
            <OrderList title="Right" ids={config.orderRight} onMove={(id, d) => move("orderRight", id, d)} />
          </div>
        </section>

        <section>
          <h2>Appearance</h2>
          <div className="form-grid">
            <label>
              Theme
              <select value={config.theme} onChange={(e) => window.rice.setConfig({ theme: e.target.value })}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
            <label>
              Clock
              <select value={config.clockFormat} onChange={(e) => window.rice.setConfig({ clockFormat: e.target.value })}>
                <option value="12">12-hour</option>
                <option value="24">24-hour</option>
              </select>
            </label>
            <label>
              Height
              <select value={String(config.barHeight)} onChange={(e) => window.rice.setConfig({ barHeight: Number(e.target.value) })}>
                <option value="28">Compact 28px</option>
                <option value="32">Default 32px</option>
                <option value="36">Comfortable 36px</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={config.showSeconds} onChange={(e) => window.rice.setConfig({ showSeconds: e.target.checked })} />
              Show seconds
            </label>
          </div>
          <div className="accents">
            {ACCENTS.map((c) => (
              <button
                key={c}
                className="swatch"
                style={{ background: c, outline: config.accent === c ? "2px solid #fff" : "none" }}
                onClick={() => window.rice.setConfig({ accent: c })}
                aria-label={c}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function OrderList({ title, ids, onMove }: { title: string; ids: WidgetId[]; onMove: (id: WidgetId, dir: -1 | 1) => void }) {
  return (
    <div className="order-list">
      <h3>{title}</h3>
      {ids.map((id, i) => (
        <div key={id} className="order-row">
          <span>{WIDGET_META.find((w) => w.id === id)?.label || id}</span>
          <span className="order-btns">
            <button disabled={i === 0} onClick={() => onMove(id, -1)}>↑</button>
            <button disabled={i === ids.length - 1} onClick={() => onMove(id, 1)}>↓</button>
          </span>
        </div>
      ))}
    </div>
  );
}
