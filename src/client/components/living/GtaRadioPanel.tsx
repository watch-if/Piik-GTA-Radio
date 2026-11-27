import { useEffect, useState } from "react";
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

type Result = Extract<ServerMessage, { type: "gta-radio-result" }>["result"];

export function GtaRadioPanel({ roomId, live, result, onSelect }: {
  roomId: string;
  live: boolean;
  result: Result | null;
  onSelect: (station: number) => void;
}) {
  const { t } = useCopy();
  const [enabled, setEnabled] = useState(false);
  const [requested, setRequested] = useState<{ roomId: string; station: number } | null>(null);

  useEffect(() => {
    let current = true;
    void getRuntimeCapabilities().then((capabilities) => {
      if (current) setEnabled(capabilities.gtaRadio === true);
    }).catch(() => {
      if (current) setEnabled(false);
    });
    return () => { current = false; };
  }, [roomId]);

  if (!enabled) return null;
  const status = {
    sent: "gtaRadio.sent",
    "not-driving": "gtaRadio.notDriving",
    unavailable: "gtaRadio.unavailable",
    busy: "gtaRadio.busy",
  } as const;

  return (
    <section className="lr-gta-radio" aria-label={t("gtaRadio.label")}>
      <div className="lr-gta-radio-heading">
        <span aria-hidden="true" className="lr-gta-radio-signal">▂▅▇</span>
        <span>{t("gtaRadio.label")}</span>
        <span role="status">{live && result ? t(status[result]) : ""}</span>
      </div>
      <div className="lr-gta-radio-stations">
        {stations.map((station, index) => {
          const slug = station.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const art = stationArt[`./station-art/${slug}.png`] ?? stationArt[`./station-art/${slug}.webp`];
          return (
          <button
            className="lr-gta-radio-station"
            key={index}
            type="button"
            disabled={!live}
            data-sent={live && result === "sent" && requested?.roomId === roomId && requested.station === index}
            onClick={() => {
              setRequested({ roomId, station: index });
              onSelect(index);
            }}
          >
            <span className="lr-gta-radio-icon" aria-hidden="true">{art ? <img src={art} alt="" /> : stationIcons[index]}</span>
            <span>{index === 0 ? t("gtaRadio.off") : station}</span>
          </button>
          );
        })}
      </div>
    </section>
  );
}
