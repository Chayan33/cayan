import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  X,
  MapPin,
  Package,
  GlassWater,
  Sandwich,
  Coffee,
  BriefcaseMedical,
  Leaf,
  Armchair,
  Lamp,
  Shield,
  FlaskConical,
  Heart,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useGame } from "../game/store";
import { places, placeById } from "../game/world";
import { questById } from "../game/quests";
export function Mark() {
  return (
    <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path
        d="M5 10 18 3l13 7v16l-13 7-13-7V10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M12 11h12v4h-8v3h8v7H12v-4h8v-1h-8v-9Z" fill="currentColor" />
    </svg>
  );
}
export function Key({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}
export function keyName(code: string) {
  return code
    .replace("Key", "")
    .replace("Digit", "")
    .replace("Left", "")
    .replace("Right", "")
    .toUpperCase();
}
export function BoundKey({ action }: { action: string }) {
  const code = useGame((s) => s.settings.keys[action]);
  return <Key>{keyName(code || "")}</Key>;
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="eyebrow">
      <span className="tiny-line" />
      {children}
    </div>
  );
}
export function Close({ onClick }: { onClick?: () => void }) {
  const s = useGame();
  return (
    <button
      className="close-button"
      onClick={onClick || (() => s.setPanel(s.playing ? "none" : "menu"))}
      aria-label="Kapat"
    >
      <X size={19} />
      <span>ESC</span>
    </button>
  );
}
export function Primary({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      disabled={disabled}
      className={`primary ${className}`}
      onClick={onClick}
    >
      <span>{children}</span>
      <ArrowUpRight size={21} />
    </button>
  );
}
export function ItemIcon({ id, size = 26 }: { id: string; size?: number }) {
  const Icon =
    (
      {
        water: GlassWater,
        food: Sandwich,
        tea: Coffee,
        medkit: BriefcaseMedical,
        vex: FlaskConical,
        chair: Armchair,
        plant: Leaf,
        lamp: Lamp,
        mask: Shield,
      } as Record<string, typeof Package>
    )[id] || Package;
  return <Icon size={size} strokeWidth={1.35} />;
}
export function Stat({
  icon,
  label,
  value,
  color = "sage",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className={`stat ${color}`} title={`${label}: ${Math.round(value)}`}>
      <span>{icon}</span>
      <div>
        <div className="stat-title">
          <span>{label}</span>
          <b>{Math.round(value)}</b>
        </div>
        <div className="stat-track">
          <i style={{ width: `${value}%` }} />
        </div>
      </div>
    </div>
  );
}
export function GameMap({ mini = false }: { mini?: boolean }) {
  const s = useGame();
  const active = s.save.active;
  const goal = active
    ? placeById[questById[active.id].stages[active.stage].place]
    : placeById.market;
  const pos = s.save.pos;
  const toX = (x: number) => 100 + x;
  const toY = (z: number) => 100 + z;
  return (
    <div className={mini ? "minimap-surface" : "world-map"}>
      <svg
        viewBox={
          mini ? `${toX(pos[0]) - 34} ${toY(pos[1]) - 34} 68 68` : "0 0 200 200"
        }
        role="img"
        aria-label={mini ? "Yakın çevre haritası" : "Karayaka şehir haritası"}
      >
        <defs>
          <pattern
            id={mini ? "grid-mini" : "grid-map"}
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="#e3dfca"
              strokeWidth=".12"
              opacity=".14"
            />
          </pattern>
        </defs>
        <rect width="200" height="200" fill="#253e40" />
        <rect
          width="200"
          height="200"
          fill={`url(#${mini ? "grid-mini" : "grid-map"})`}
        />
        <path d="M0 0H200V14L140 12 105 17 44 10 0 17Z" fill="#527779" />
        <path
          d="M0 16 Q65 10 100 18 T200 15"
          fill="none"
          stroke="#91a6a0"
          strokeWidth=".9"
        />
        {[-48, 0, 48].map((v) => (
          <g key={v}>
            <path
              d={`M${100 + v} 18V188 M7 ${100 + v}H193`}
              stroke="#74817a"
              strokeWidth="7"
            />
            <path
              d={`M${100 + v} 18V188 M7 ${100 + v}H193`}
              stroke="#b0ab91"
              strokeWidth=".3"
              strokeDasharray="2 2"
            />
          </g>
        ))}
        {[-74, -25, 25, 74].flatMap((x) =>
          [-64, -21, 22, 66].map((z) => (
            <rect
              key={`${x}-${z}`}
              x={toX(x) - 10}
              y={toY(z) - 10}
              width="20"
              height="20"
              rx=".7"
              fill="#68786c"
              stroke="#95a38a"
              strokeWidth=".35"
            />
          )),
        )}
        {!mini && (
          <>
            <text x="51" y="7" className="map-sea">
              A K D E N İ Z
            </text>
            <text x="22" y="182" className="map-label">
              YENİŞEHİR
            </text>
            <text x="140" y="95" className="map-label">
              SANAYİ
            </text>
            <text x="86" y="172" className="map-label">
              MERKEZ
            </text>
          </>
        )}
        {places.map((p) => (
          <g
            key={p.id}
            className={mini ? "" : "map-point"}
            tabIndex={mini ? undefined : 0}
            role={mini ? undefined : "button"}
            aria-label={p.name}
            onClick={
              mini
                ? undefined
                : () => {
                    useGame.setState({ waypoint: p.pos });
                    s.notify(`${p.name} haritada işaretlendi.`);
                  }
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") useGame.setState({ waypoint: p.pos });
            }}
          >
            <circle
              cx={toX(p.pos[0])}
              cy={toY(p.pos[1])}
              r={mini ? 1 : 2}
              fill={p.id === goal?.id ? "#f5b779" : "#b3c8b5"}
            />
            {!mini && (
              <text
                x={toX(p.pos[0]) + 3.4}
                y={toY(p.pos[1]) + 1.1}
                className="map-location"
              >
                {p.name}
              </text>
            )}
          </g>
        ))}
        {goal && (
          <>
            <circle
              cx={toX(goal.pos[0])}
              cy={toY(goal.pos[1])}
              r={mini ? 3 : 4}
              fill="none"
              stroke="#f0b478"
              strokeWidth=".6"
            />
            <path
              d={`M${toX(pos[0])} ${toY(pos[1])}L${toX(goal.pos[0])} ${toY(goal.pos[1])}`}
              stroke="#f0b478"
              strokeWidth={mini ? 0.35 : 0.5}
              strokeDasharray="1 2"
              opacity=".6"
            />
          </>
        )}
        {s.save.dropped && (
          <rect
            x={toX(s.save.dropped[0]) - 1.3}
            y={toY(s.save.dropped[1]) - 1.3}
            width="2.6"
            height="2.6"
            fill="#d4ab74"
          />
        )}
        {s.waypoint && (
          <circle
            cx={toX(s.waypoint[0])}
            cy={toY(s.waypoint[1])}
            r="3"
            fill="none"
            stroke="#bde4e0"
          />
        )}
        {s.network.peers.map((p) => (
          <circle
            key={p.id}
            cx={toX(p.pos[0])}
            cy={toY(p.pos[1])}
            r="1.8"
            fill="#a9bce3"
          />
        ))}
        <circle
          cx={toX(pos[0])}
          cy={toY(pos[1])}
          r={mini ? 3.3 : 3.5}
          fill="#f0e4c9"
          opacity=".12"
        />
        <path
          d={`M${toX(pos[0])} ${toY(pos[1]) - 2.2}l-1.7 4.2 1.7-1 1.7 1Z`}
          fill="#f0e4c9"
        />
      </svg>
      {mini && (
        <>
          <span className="map-north">K</span>
          <span className="map-cross" />
          <div className="map-coordinate">36° 48′ K / 34° 38′ D</div>
        </>
      )}
    </div>
  );
}
export {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  MapPin,
  Package,
  Heart,
  Zap,
};
