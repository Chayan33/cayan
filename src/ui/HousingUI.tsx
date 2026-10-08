import {
  DoorOpen,
  KeyRound,
  Lock,
  Package,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useGame } from "../game/store";
import { roomCommand } from "../game/network";
import { items } from "../game/world";
import { ItemIcon } from "./components";
export function SharedHome() {
  const s = useGame(),
    house = s.network.house;
  if (!house) return null;
  const owner = house.owner === s.network.id;
  return (
    <section className="shared-home">
      <div className="section-label">
        <span className="label-with-icon">
          <Users size={14} /> ORTAK EV
        </span>
        <span>{house.locked ? "KAPI KİLİTLİ" : "KAPI AÇIK"}</span>
      </div>
      <p className="fine-print">
        Aynı mekânı ve eşyaları paylaşıyorsunuz.{" "}
        {owner
          ? "Davet ve düzenleme izinlerini sen yönetiyorsun."
          : "Davetin varsa kapı kilitliyken de içeri girebilirsin."}
      </p>
      {!s.interior && (
        <button className="secondary" onClick={() => s.enterHome()}>
          <DoorOpen size={16} />
          Ortak eve gir
        </button>
      )}
      {s.network.peers.map((peer) => (
        <div className="home-permission" key={peer.id}>
          <div>
            <b>{peer.name}</b>
            <small>{peer.inside ? "Evin içinde" : "Şehirde"}</small>
          </div>
          {owner ? (
            <>
              <button
                className={house.guests.includes(peer.id) ? "allowed" : ""}
                onClick={() =>
                  roomCommand("home-permission", { to: peer.id, role: "visit" })
                }
              >
                <KeyRound size={14} />
                {house.guests.includes(peer.id) ? "Davetli" : "Davet et"}
              </button>
              <button
                className={house.decorators.includes(peer.id) ? "allowed" : ""}
                onClick={() =>
                  roomCommand("home-permission", {
                    to: peer.id,
                    role: "decorate",
                  })
                }
              >
                <ShieldCheck size={14} />
                {house.decorators.includes(peer.id)
                  ? "Düzenleyebilir"
                  : "Düzenleme izni"}
              </button>
            </>
          ) : (
            <span>
              {house.owner === peer.id
                ? "Ev sahibi"
                : house.guests.includes(peer.id)
                  ? "Davetli"
                  : "Misafir"}
            </span>
          )}
        </div>
      ))}
      <div className="section-label">
        ORTAK EŞYA DOLABI <Package size={14} />
      </div>
      {!s.interior ? (
        <p className="fine-print">Dolabı kullanmak için evin içine gir.</p>
      ) : (
        <div className="storage-grid">
          {Object.keys(items)
            .filter(
              (id) =>
                (s.save.inventory[id] || 0) + (house.storage[id] || 0) > 0,
            )
            .map((id) => (
              <div className="storage-row" key={id}>
                <ItemIcon id={id} size={21} />
                <div>
                  <b>{items[id].name}</b>
                  <small>
                    Çantanda {s.save.inventory[id] || 0} · Dolapta{" "}
                    {house.storage[id] || 0}
                  </small>
                </div>
                <button
                  disabled={!s.save.inventory[id]}
                  onClick={() => roomCommand("home-store", { id })}
                >
                  Bırak
                </button>
                <button
                  disabled={!house.storage[id]}
                  onClick={() => roomCommand("home-take", { id })}
                >
                  Al
                </button>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
