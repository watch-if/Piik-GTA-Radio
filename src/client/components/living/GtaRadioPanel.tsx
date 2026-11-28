import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getRuntimeCapabilities } from "../../lib/api";
import { useCopy } from "../../ui/copy";
import type { ServerMessage } from "../../../shared/protocol";
import "./gta-radio-panel.css";

// Preset order matches native/gta-radio/PiikGtaRadio.cpp.
const stations = [
  "", "Los Santos Rock Radio", "Non-Stop-Pop FM", "Radio Los Santos",
  "Channel X", "West Coast Talk Radio", "Rebel Radio", "Soulwax FM",
  "East Los FM", "West Coast Classics", "Blaine County Radio", "Blue Ark",
  "Worldwide FM", "FlyLo FM", "The Lowdown 91.1", "Radio Mirror Park",
  "Space 103.2", "Vinewood Boulevard Radio", "Self Radio", "The Lab", "Blonded Los Santos 97.8 FM", "iFruit Radio",
];

const stationIcons = [
  "\u23fb", "LS\nROCK", "NON\nSTOP", "RLS", "CH\nX", "WC\nTALK",
  "REBEL", "SOUL\nWAX", "EAST\nLOS", "WCC", "BLAINE", "BLUE\nARK",
  "WWFM", "FLYLO", "91.1", "MIRROR", "103.2", "VBR", "SELF", "LAB", "BLONDED", "IFRUIT",
];

const stationArt = import.meta.glob<string>("./station-art/*.{png,webp}", {
  eager: true,
  import: "default",
  query: "?url",
});

const genres = ["", "Classic Rock", "Pop", "Hip-Hop", "Punk", "Talk", "Country", "Dance", "Regional Mexican", "Classic Hip-Hop", "Talk", "Reggae", "Eclectic", "Electronic", "Soul & Funk", "Indie", "Funk", "Alternative Rock", "Personal Mix", "Hip-Hop", "R&B", "Hip-Hop & Grime"];
const frequencies: Record<number, string> = { 5: "95.6 FM", 14: "91.1 FM", 16: "103.2 FM", 20: "97.8 FM" };
const count = stations.length - 1;
const stationAt = (position: number) => ((position % count + count) % count) + 1;

type Result = Extract<ServerMessage, { type: "gta-radio-result" }>["result"];

export function GtaRadioPanel(props: {
  roomId: string;
  live: boolean;
  result: Result | null;
  onSelect: (station: number) => void;
}) {
  const [enabledRoom, setEnabledRoom] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    void getRuntimeCapabilities().then((capabilities) => {
      if (current) setEnabledRoom(capabilities.gtaRadio === true ? props.roomId : null);
    }).catch(() => {
      if (current) setEnabledRoom(null);
    });
    return () => { current = false; };
  }, [props.roomId]);

  return enabledRoom === props.roomId ? <RadioStrip key={props.roomId} {...props} /> : null;
}

function RadioStrip({ live, result, onSelect }: {
  live: boolean;
  result: Result | null;
  onSelect: (station: number) => void;
}) {
  const { t } = useCopy();
  const [position, setPosition] = useState(0);
  const [off, setOff] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const positionRef = useRef(0);
  const panel = useRef<HTMLElement>(null);
  const touchStart = useRef<{ x: number; y: number; position: number; step: number; moved: boolean } | null>(null);
  const ignoreClickUntil = useRef(0);
  const lastWheel = useRef(-Infinity);
  const lastSent = useRef(-Infinity);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const sendStation = useEffectEvent((station: number) => {
    setPending(false);
    if (!live) return;
    lastSent.current = performance.now();
    onSelect(station);
  });

  useEffect(() => () => clearTimeout(sendTimer.current), [live]);

  function queueStation(station: number) {
    clearTimeout(sendTimer.current);
    // The server accepts one radio command per 750 ms. Keep the latest choice.
    const delay = Math.max(0, 800 - (performance.now() - lastSent.current));
    setPending(true);
    sendTimer.current = setTimeout(() => sendStation(station), delay);
  }

  function select(next: number) {
    if (!live) return;
    positionRef.current = next;
    setPosition(next);
    setOff(false);
    queueStation(stationAt(next));
  }

  function updateDrag(x: number, y: number) {
    const start = touchStart.current;
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (!start.moved) {
      if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy)) return;
      start.moved = true;
    }
    const shift = Math.round(-dx / start.step);
    setPosition(start.position + shift);
    setDragOffset(dx + shift * start.step);
    return start.position + shift;
  }
  const scrollStation = useEffectEvent((event: WheelEvent) => {
    if (!live || event.ctrlKey) return;
    const delta = event.shiftKey && Math.abs(event.deltaY) > 0
      ? event.deltaY
      : Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
    if (delta === 0) return;
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheel.current < 100) return;
    lastWheel.current = now;
    select(positionRef.current + Math.sign(delta));
  });

  useEffect(() => {
    const element = panel.current;
    const handleWheel = (event: WheelEvent) => scrollStation(event);
    element?.addEventListener("wheel", handleWheel, { passive: false });
    return () => element?.removeEventListener("wheel", handleWheel);
  }, []);

  const index = stationAt(position);
  const status = {
    sent: "gtaRadio.sent",
    "not-driving": "gtaRadio.notDriving",
    unavailable: "gtaRadio.unavailable",
    busy: "gtaRadio.busy",
  } as const;

  return (
    <section ref={panel} className="lr-gta-radio" aria-label={t("gtaRadio.label")}
        onKeyDown={(event) => {
          if (!live || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
          if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]:not([contenteditable=false])")) return;
          event.preventDefault();
          select(positionRef.current + (event.key === "ArrowRight" ? 1 : -1));
        }}
      >
      <div className="lr-gta-radio-carousel">
        <button type="button" className="lr-gta-radio-arrow" aria-label={t("gtaRadio.previous")}
          disabled={!live} onClick={() => select(positionRef.current - 1)}>&#x2039;</button>
        <div className="lr-gta-radio-track" tabIndex={live ? 0 : -1} role="group" aria-label={t("gtaRadio.label")}
          data-dragging={dragOffset !== null}
          style={{ "--radio-drag": (dragOffset ?? 0) + "px" } as CSSProperties}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            touchStart.current = live && event.touches.length === 1 ? {
              x: touch.clientX, y: touch.clientY, position: positionRef.current, moved: false,
              step: Math.max(48, Math.min(94, event.currentTarget.clientWidth * .21)),
            } : null;
          }}
          onTouchMove={(event) => {
            if (event.touches.length === 1) updateDrag(event.touches[0].clientX, event.touches[0].clientY);
          }}
          onTouchCancel={() => {
            touchStart.current = null;
            setPosition(positionRef.current);
            setDragOffset(null);
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0];
            const next = touch && updateDrag(touch.clientX, touch.clientY);
            touchStart.current = null;
            setDragOffset(null);
            if (next === undefined) return;
            ignoreClickUntil.current = performance.now() + 350;
            select(next);
          }}        >
          {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
            const slot = position + offset;
            const station = stationAt(slot);
            const name = stations[station];
            const base = "./station-art/" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const art = stationArt[base + ".png"] ?? stationArt[base + ".webp"];
            return (
              <button type="button" key={slot} className="lr-gta-radio-station"
                style={{ "--radio-offset": offset } as CSSProperties}
                data-center={offset === 0} data-edge={Math.abs(offset) === 3}
                disabled={!live} tabIndex={-1}
                aria-hidden={Math.abs(offset) === 3}
                aria-label={name} aria-pressed={offset === 0 && !off}
                onClick={() => {
                  if (performance.now() >= ignoreClickUntil.current) select(slot);
                }}>
                {art ? <img src={art} alt="" draggable={false} /> : <span aria-hidden="true">{stationIcons[station]}</span>}
              </button>
            );
          })}
        </div>
        <button type="button" className="lr-gta-radio-arrow" aria-label={t("gtaRadio.next")}
          disabled={!live} onClick={() => select(positionRef.current + 1)}>&#x203a;</button>
      </div>
      <div className="lr-gta-radio-hud">
        <div className="lr-gta-radio-info" aria-live="polite">
          <strong>{off ? t("gtaRadio.off") : stations[index]}</strong>
          <div className="lr-gta-radio-meta">
            {!off && <span className="lr-gta-radio-genre">{genres[index]}</span>}
            <span>{off ? "RADIO OFF" : index === 18 ? "SELF RADIO" : frequencies[index] ?? t("gtaRadio.frequencyUnknown")}</span>
          </div>
        </div>
        <div className="lr-gta-radio-controls">
          <div className="lr-gta-radio-spectrum" data-active={live && !off && !pending && result === "sent"} aria-hidden="true">
            <i /><i /><i /><i /><i />
          </div>
          <button className="lr-gta-radio-off" type="button" aria-label={t("gtaRadio.off")}
            aria-pressed={off} disabled={!live} onClick={() => {
              if (off) select(positionRef.current);
              else {
                setOff(true);
                queueStation(0);
              }
            }}>OFF</button>
        </div>
        <div className="lr-gta-radio-footer" role="status">
          {live && !pending && result && result !== "sent" && <span title={t(status[result])}>{t(status[result])}</span>}
          {!off && <span>{t("gtaRadio.trackUnavailable")}</span>}
        </div>
      </div>
    </section>
  );
}
