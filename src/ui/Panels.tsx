import { AvatarPreview } from "./AvatarPreview";
import { SharedHome } from "./HousingUI";
import { PawnShop, LoanLedger } from "./EconomyUI";
import { useEffect, useState, useRef } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Banknote,
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  DoorOpen,
  Home,
  KeyRound,
  Lock,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Radio,
  RotateCcw,
  Settings,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Trophy,
  Users,
  Volume2,
  Wrench,
  X,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Gamepad2,
  Heart,
  Leaf,
  Paintbrush,
} from "lucide-react";
import { useGame, networkCommand } from "../game/store";
import { quests, questById, available, levelFromXP } from "../game/quests";
import { items, places, placeById } from "../game/world";
import { connectRoom, leaveRoom, roomCommand } from "../game/network";
import { audio } from "../game/audio";
import {
  Close,
  BoundKey,
  Eyebrow,
  Primary,
  ItemIcon,
  GameMap,
  Key,
  Mark,
} from "./components";
import type { Category, Quest } from "../game/types";
const money = (n: number) => n.toLocaleString("tr-TR");
function Header({
  tag,
  title,
  desc,
}: {
  tag: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="panel-header">
      <div>
        <Eyebrow>{tag}</Eyebrow>
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      <Close />
    </div>
  );
}
export function Journal() {
  const s = useGame();
  const [filter, setFilter] = useState<Category | "Tümü">("Tümü");
  const [selected, setSelected] = useState(s.save.active?.id || "legal-1");
  const q = questById[selected];
  const done = s.save.completed.includes(q.id);
  const can = available(
    q,
    s.save.completed,
    s.save.xp,
    s.network.peers.length + 1,
  );
  const near =
    Math.hypot(
      s.save.pos[0] - placeById[q.stages[0].place].pos[0],
      s.save.pos[1] - placeById[q.stages[0].place].pos[1],
    ) < 4.5;
  const current = s.save.active?.id === q.id;
  const groups = [
    "Tümü",
    "Yasal iş",
    "Hikâye",
    "Riskli iş",
    "Birlikte",
    "Yan görev",
  ] as const;
  return (
    <div className="panel journal">
      <Header
        tag="HER İŞ BİR HİKÂYE"
        title="Görev günlüğü"
        desc={`${s.save.completed.length} / 80 tamamlandı · Seviye ${levelFromXP(s.save.xp)}`}
      />
      <div className="tabs">
        {groups.map((c) => (
          <button
            key={c}
            className={filter === c ? "active" : ""}
            onClick={() => setFilter(c)}
          >
            {c}
            <span>
              {c === "Tümü"
                ? 80
                : quests.filter((q) => q.category === c).length}
            </span>
          </button>
        ))}
      </div>
      <div className="journal-body">
        <div className="quest-list">
          {quests
            .filter((q) => filter === "Tümü" || q.category === filter)
            .map((q, i) => {
              const unlocked = available(
                  q,
                  s.save.completed,
                  s.save.xp,
                  s.network.peers.length + 1,
                ),
                done = s.save.completed.includes(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => setSelected(q.id)}
                  className={`quest-row ${selected === q.id ? "selected" : ""} ${!unlocked ? "locked" : ""}`}
                >
                  <span className="quest-number">
                    {done ? (
                      <Check size={17} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <div>
                    <small>
                      {q.category} · Sv. {q.level}
                    </small>
                    <h3>{q.title}</h3>
                    <span>{q.giver}</span>
                  </div>
                  <div className="quest-row-end">
                    {!unlocked ? (
                      <Lock size={14} />
                    ) : (
                      <ArrowUpRight size={17} />
                    )}
                    <b>{money(q.reward)} ₺</b>
                  </div>
                </button>
              );
            })}
        </div>
        <section className="quest-detail">
          <div className="quest-category">
            <span className={`status-dot ${q.risk ? "danger" : ""}`} />
            {q.category}
            <span>
              {q.minutes ? `${q.minutes} dk sınırı` : "Süre sınırı yok"}
            </span>
          </div>
          <div className="quest-art">
            <div className="quest-art-lines" />
            <span>
              {q.category === "Riskli iş" ? (
                <Eye />
              ) : q.category === "Birlikte" ? (
                <Users />
              ) : (
                <Package />
              )}
            </span>
            <b>KARAYAKA</b>
            <i>İŞ DOSYASI / {q.id.toUpperCase()}</i>
          </div>
          <h2>{q.title}</h2>
          <p className="story-copy">{q.story}</p>
          <div className="quest-rewards">
            <div>
              <Banknote />
              <span>
                YEVMİYE<b>{money(q.reward)} ₺</b>
              </span>
            </div>
            <div>
              <Sparkles />
              <span>
                DENEYİM<b>+{q.xp}</b>
              </span>
            </div>
            <div>
              <Shield />
              <span>
                RİSK<b>{q.risk ? `%${q.risk}` : "Güvenli"}</b>
              </span>
            </div>
          </div>
          <div className="section-label">
            İŞ PLANI <span>{q.stages.length} AŞAMA</span>
          </div>
          <ol className="objective-list">
            {q.stages.map((o, i) => (
              <li
                className={current && i < s.save.active!.stage ? "done" : ""}
                key={i}
              >
                <span>
                  {current && i < s.save.active!.stage ? (
                    <Check size={12} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <div>
                  {o.text}
                  <small>{placeById[o.place].name}</small>
                </div>
              </li>
            ))}
          </ol>
          <p className="fine-print">{q.failure}</p>
          {!can && (
            <div className="requirement">
              <Lock size={14} />
              {q.category === "Birlikte" && s.network.peers.length < 1
                ? "Aynı odada en az 2 oyuncu gerekli."
                : q.requires.some((id) => !s.save.completed.includes(id))
                  ? `Önce “${questById[q.requires.find((id) => !s.save.completed.includes(id))!].title}” işini tamamla.`
                  : `Seviye ${q.level} gerekli.`}
            </div>
          )}
          {current ? (
            <button
              className="secondary danger-text"
              onClick={() => s.abandonQuest()}
            >
              Bu işi bırak
            </button>
          ) : done && !q.repeatable ? (
            <div className="completed-stamp">
              <CheckCircle2 />
              HİKÂYE TAMAMLANDI
            </div>
          ) : (
            <Primary
              disabled={!can || !!s.save.active}
              onClick={() => {
                if (near) s.acceptQuest(q.id);
                else {
                  useGame.setState({
                    waypoint: placeById[q.stages[0].place].pos,
                  });
                  s.setPanel("none");
                  s.notify(
                    `İşi almak için ${placeById[q.stages[0].place].name} konumuna git.`,
                  );
                }
              }}
            >
              {s.save.active
                ? "Önce aktif işini tamamla"
                : near
                  ? "İşi kabul et"
                  : "Başlangıç noktasını işaretle"}
            </Primary>
          )}
        </section>
      </div>
    </div>
  );
}
export function Inventory() {
  const s = useGame();
  const [selected, setSelected] = useState<string>("water");
  const item = items[selected];
  return (
    <div className="panel inventory">
      <Header
        tag="YANINDA TAŞIDIKLARIN"
        title="Ceplerindeki hayat"
        desc="İhtiyacın olanı yanında tut. Fazlasını evinde sakla."
      />
      <div className="inventory-summary">
        <div>
          <span>NAKİT</span>
          <b>
            {money(s.save.cash)} <small>₺</small>
          </b>
        </div>
        <div>
          <span>EV KASASI</span>
          <b>
            {money(s.save.bank)} <small>₺</small>
          </b>
        </div>
        <div>
          <span>TAŞINAN EŞYA</span>
          <b>
            {Object.values(s.save.inventory).reduce((a, b) => a + b, 0)}{" "}
            <small>ADET</small>
          </b>
        </div>
      </div>
      <div className="inventory-body">
        <div className="item-grid">
          {Object.entries(items).map(([id, item]) => (
            <button
              key={id}
              className={`item-slot ${selected === id ? "selected" : ""} ${!s.save.inventory[id] ? "empty" : ""}`}
              onClick={() => setSelected(id)}
            >
              <span className="item-count">{s.save.inventory[id] || 0}</span>
              <ItemIcon id={id} size={38} />
              <span>{item.name}</span>
              {!!s.save.inventory[id] && <i />}
            </button>
          ))}
        </div>
        <aside className="item-detail">
          <div className="item-large">
            <ItemIcon id={selected} size={80} />
          </div>
          <small>GÜNLÜK YAŞAM / EŞYA</small>
          <h2>{item.name}</h2>
          <p>{item.desc}</p>
          <div className="item-meta">
            <span>Piyasa değeri</span>
            <b>{item.price} ₺</b>
          </div>
          <div className="item-meta">
            <span>Çantanda</span>
            <b>{s.save.inventory[selected] || 0} adet</b>
          </div>
          {item.effect ? (
            <Primary
              disabled={!s.save.inventory[selected]}
              onClick={() => s.use(selected)}
            >
              Kullan
            </Primary>
          ) : (
            <Primary
              disabled={!s.save.inventory[selected] || selected === "mask"}
              onClick={() => {
                if (!s.interior)
                  return s.notify("Mobilya yerleştirmek için evine gir.");
                useGame.setState({ decorating: selected, panel: "none" });
              }}
            >
              {selected === "mask"
                ? "Taşırken otomatik takılır"
                : "Evde yerleştir"}
            </Primary>
          )}
        </aside>
      </div>
      {s.save.carrying && (
        <div className="carry-note">
          <Package size={18} />
          <span>
            Görev kolisi elinde. Koşamazsın; <BoundKey action="drop" /> ile yere
            bırakabilirsin.
          </span>
        </div>
      )}
    </div>
  );
}
export function MapPanel() {
  const s = useGame();
  const goal = s.save.active
    ? placeById[questById[s.save.active.id].stages[s.save.active.stage].place]
    : placeById.market;
  return (
    <div className="panel map-panel">
      <Header
        tag="AKDENİZ’İN UNUTULAN KIYISI"
        title="Karayaka"
        desc="Yedi bölge. Bir şehir. Senin hikâyen."
      />
      <div className="map-layout">
        <GameMap />
        <aside className="map-aside">
          <div className="map-aside-top">
            <MapPin size={27} />
            <span>AKTİF HEDEF</span>
            <h3>{goal.name}</h3>
            <p>{goal.district}</p>
            <b>
              {Math.round(
                Math.hypot(
                  goal.pos[0] - s.save.pos[0],
                  goal.pos[1] - s.save.pos[1],
                ),
              )}{" "}
              m
            </b>
          </div>
          <div className="section-label">ŞEHİR REHBERİ</div>
          {places
            .filter((p) =>
              [
                "market",
                "home",
                "clinic",
                "warehouse",
                "pawn",
                "beach",
                "alley",
              ].includes(p.id),
            )
            .map((p) => (
              <button
                className="map-location-row"
                key={p.id}
                onClick={() => {
                  useGame.setState({ waypoint: p.pos });
                  s.notify(`${p.name} işaretlendi.`);
                }}
              >
                <span style={{ background: p.color }} />
                <div>
                  {p.name}
                  <small>{p.district}</small>
                </div>
                <ArrowUpRight size={15} />
              </button>
            ))}
          <button
            className="text-button"
            onClick={() => useGame.setState({ waypoint: null })}
          >
            İşareti kaldır
          </button>
          <p className="fine-print">
            Haritada bir konuma tıkla, hedefini işaretle. Şehirde oraya
            yürüyerek ulaş.
          </p>
        </aside>
      </div>
    </div>
  );
}
export function Dialogue() {
  const s = useGame();
  const p = placeById[s.selectedPlace || "market"];
  const related = quests
    .filter(
      (q) =>
        q.giver === p.npc &&
        !s.save.completed.includes(q.id) &&
        available(q, s.save.completed, s.save.xp, s.network.peers.length + 1),
    )
    .slice(0, 3);
  return (
    <div className="dialogue">
      <div className="dialogue-person">
        <div
          className="portrait"
          style={{ "--portrait": p.color } as React.CSSProperties}
        >
          <div className="portrait-body" />
          <div className="portrait-head" />
        </div>
        <div>
          <Eyebrow>{p.role}</Eyebrow>
          <h2>{p.npc}</h2>
          <span>
            <MapPin size={13} />
            {p.name}
          </span>
        </div>
        <Close />
      </div>
      <blockquote>“{p.dialogue}”</blockquote>
      <div className="dialogue-options">
        {related.map((q) => (
          <button key={q.id} onClick={() => s.acceptQuest(q.id)}>
            <span className="option-index">
              {String(related.indexOf(q) + 1).padStart(2, "0")}
            </span>
            <div>
              <b>{q.title}</b>
              <small>İşi kabul et · {q.stages.length} aşama</small>
            </div>
            <span className="option-reward">+{money(q.reward)} ₺</span>
            <ArrowUpRight size={18} />
          </button>
        ))}
        {p.kind === "shop" && (
          <button onClick={() => s.setPanel("shop")}>
            <ShoppingBag size={18} />
            <div>
              <b>
                {p.id === "pawn" ? "Alışveriş / eşya satışı" : "Dükkâna göz at"}
              </b>
              <small>İhtiyaçlarını tamamla</small>
            </div>
            <ChevronRight size={18} />
          </button>
        )}
        {p.kind === "home" && (
          <>
            <button
              onClick={() => {
                s.enterHome();
                audio.play("door");
                s.notify(
                  "Evindesin. Kapıya yaklaşarak E ile çık; içeride E ile evini yönet.",
                );
              }}
            >
              <DoorOpen size={18} />
              <div>
                <b>Evine gir</b>
                <small>Dinlen, eşyalarını yerleştir</small>
              </div>
              <ChevronRight size={18} />
            </button>
            <button onClick={() => s.setPanel("home")}>
              <Home size={18} />
              <div>
                <b>Kasa ve ev yönetimi</b>
                <small>
                  {s.save.ownedHome
                    ? "Kendi evin"
                    : `Kalan kira borcu: ${s.save.debt} ₺`}
                </small>
              </div>
              <ChevronRight size={18} />
            </button>
          </>
        )}
        {p.kind === "clinic" && (
          <button onClick={() => s.setPanel("rehab")}>
            <Heart size={18} />
            <div>
              <b>Destek görüşmesine katıl</b>
              <small>İhtiyaç, stres ve toleransı azalt</small>
            </div>
            <span>60 ₺</span>
            <ChevronRight size={18} />
          </button>
        )}
        {p.id === "alley" && (
          <button onClick={() => s.setPanel("shop")}>
            <ShoppingBag size={18} />
            <div>
              <b>Tezgâha göz at</b>
              <small>Seçimlerinin sonuçları var</small>
            </div>
            <ChevronRight size={18} />
          </button>
        )}
        <button onClick={() => s.setPanel("none")}>
          <span className="option-index">—</span>
          <div>
            <b>Sonra görüşürüz.</b>
          </div>
          <ArrowRight size={18} />
        </button>
      </div>
      {s.save.relationships[p.npc] > 0 && (
        <div className="relationship">
          <span className="status-dot" />
          Aranızdaki güven +{s.save.relationships[p.npc]}
        </div>
      )}
    </div>
  );
}
export function Shop() {
  const s = useGame();
  const p = placeById[s.selectedPlace || "market"];
  const [mode, setMode] = useState("buy");
  const ids =
    p.id === "pawn"
      ? ["chair", "plant", "lamp", "mask"]
      : p.id === "cafe"
        ? ["tea", "food", "water"]
        : p.id === "alley"
          ? ["vex", "mask"]
          : ["water", "food", "tea", "medkit"];
  const offered =
    mode === "sell"
      ? Object.keys(items).filter((id) => s.save.inventory[id] > 0)
      : ids;
  return (
    <div className="panel shop">
      <Header
        tag={`${p.npc.toLocaleUpperCase("tr-TR")} / ${p.district.toLocaleUpperCase("tr-TR")}`}
        title={p.name}
        desc="Bir ihtiyaç. Küçük bir mola. Belki yeni bir başlangıç."
      />
      <div className="shop-toolbar">
        <div className="tabs">
          <button
            className={mode === "buy" ? "active" : ""}
            onClick={() => setMode("buy")}
          >
            Satın al
          </button>
          {p.id === "pawn" && (
            <>
              <button
                className={mode === "sell" ? "active" : ""}
                onClick={() => setMode("sell")}
              >
                Eşya sat
              </button>
              <button
                className={mode === "pawn" ? "active" : ""}
                onClick={() => setMode("pawn")}
              >
                Rehin defteri
              </button>
            </>
          )}
        </div>
        <span>
          <Banknote size={17} /> {money(s.save.cash)} ₺ nakit
        </span>
      </div>
      {mode === "pawn" ? (
        <PawnShop />
      ) : (
        <div className="shop-grid">
          {offered.length === 0 && (
            <div className="empty-state">
              <Package />
              <h3>Şimdilik ceplerin boş.</h3>
              <p>Elindeki eşyaları burada nakde çevirebilirsin.</p>
            </div>
          )}
          {offered.map((id) => (
            <article key={id}>
              <div className="shop-item-image">
                <ItemIcon id={id} size={62} />
                <span>
                  {mode === "sell"
                    ? `${s.save.inventory[id]} ADET`
                    : "KARAYAKA SEÇKİSİ"}
                </span>
              </div>
              <div className="shop-item-content">
                <h3>{items[id].name}</h3>
                <p>{items[id].desc}</p>
                <button
                  className="shop-buy"
                  onClick={() => (mode === "buy" ? s.buy(id) : s.sell(id))}
                >
                  <b>
                    {mode === "buy"
                      ? items[id].price +
                        (id === "vex" ? Math.round(s.save.tolerance * 2) : 0)
                      : Math.floor(items[id].price * 0.55)}{" "}
                    ₺
                  </b>
                  <span>
                    {mode === "buy" ? "Satın al" : "Sat"} <Plus size={16} />
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
export function HomePanel() {
  const s = useGame();
  const house = s.network.house;
  const furnishings = house?.furniture || s.save.furniture;
  const locked = house?.locked ?? s.save.homeLocked;
  return (
    <div className="panel home-panel">
      <Header
        tag="ÇINAR SOKAK / NO. 3"
        title="Dönecek bir yerin var."
        desc={
          s.save.ownedHome
            ? "Bu ev artık senin."
            : "Küçük bir oda. Büyük bir başlangıç."
        }
      />
      <div className="home-layout">
        <div className="home-illustration">
          <Home size={116} strokeWidth={0.7} />
          <span>03</span>
          <p>ÇINAR APARTMANI</p>
          <small>ESKİ MAHALLE · KARAYAKA</small>
        </div>
        <div className="home-actions">
          <button onClick={() => s.homeAction("sleep")}>
            <Sun />
            <div>
              <h3>{house ? "Birlikte dinlen" : "Yeni güne uyan"}</h3>
              <p>
                {house
                  ? `${house.resting?.length || 0}/${s.network.peers.length + 1} kişi hazır. Herkes onayladığında sabah olur.`
                  : "Enerjini doldur, sabah 07.00’ye geç."}
              </p>
            </div>
            <ArrowUpRight />
          </button>
          <button onClick={() => s.homeAction("lock")}>
            <KeyRound />
            <div>
              <h3>Kapı {locked ? "kilitli" : "açık"}</h3>
              <p>{locked ? "Kilidi aç" : "Kapını kilitle"}</p>
            </div>
            <ArrowUpRight />
          </button>
          <div className="safe-box">
            <div>
              <Lock />
              <span>
                EV KASASI<b>{money(s.save.bank)} ₺</b>
              </span>
            </div>
            <div className="button-pair">
              <button onClick={() => s.homeAction("deposit")}>
                100 ₺ bırak
              </button>
              <button onClick={() => s.homeAction("withdraw")}>100 ₺ al</button>
            </div>
          </div>
          <div className="rent-row">
            <div>
              <span>Kalan kira borcu</span>
              <b>{s.save.debt} ₺</b>
            </div>
            <button
              disabled={s.save.debt === 0}
              onClick={() => s.homeAction("rent")}
            >
              100 ₺ öde
            </button>
          </div>
          <button
            disabled={s.save.ownedHome}
            onClick={() => s.homeAction("buyhome")}
          >
            <Home />
            <div>
              <h3>
                {s.save.ownedHome ? "Evin sahibi sensin" : "Evi satın al"}
              </h3>
              <p>
                {s.save.ownedHome
                  ? "Kira borcun kalmadı."
                  : "4.000 ₺ · Bu odanın tapusu senin olsun."}
              </p>
            </div>
            <ArrowUpRight />
          </button>
        </div>
      </div>
      <SharedHome />
      <div className="section-label">
        EVİNİ KENDİN YAP <span>{furnishings.length} EŞYA YERLEŞTİRİLDİ</span>
      </div>
      <div className="furniture-row">
        {["chair", "plant", "lamp"].map((id) => (
          <button
            key={id}
            disabled={!s.save.inventory[id]}
            onClick={() => {
              if (!s.interior) {
                s.enterHome();
                s.notify(
                  "Evin içine girdikten sonra E ile eşya düzenlemeyi aç.",
                );
                return;
              }
              useGame.setState({ decorating: id, panel: "none" });
              s.notify(
                "Hareket ederek yer seç. R ile döndür, E ile yerleştir.",
              );
            }}
          >
            <ItemIcon id={id} />
            <span>
              {items[id].name}
              <small>{s.save.inventory[id] || 0} adet</small>
            </span>
            <Plus size={16} />
          </button>
        ))}
      </div>
      {furnishings.map((item, index) => (
        <button
          key={index}
          className="text-button"
          onClick={() => {
            if (networkCommand) {
              networkCommand("furniture-remove", { index });
              return;
            }
            const furniture = [...s.save.furniture];
            furniture.splice(index, 1);
            useGame.setState({
              save: {
                ...s.save,
                furniture,
                inventory: {
                  ...s.save.inventory,
                  [item.id]: (s.save.inventory[item.id] || 0) + 1,
                },
              },
            });
            s.persist();
          }}
        >
          <RotateCcw size={13} />
          {items[item.id].name} · Çantaya al
        </button>
      ))}
    </div>
  );
}
export function Rehab() {
  const s = useGame();
  return (
    <div className="panel rehab-panel">
      <Header tag="YAŞAM DANIŞMA MERKEZİ" title="Her gün, yeniden." />
      <div className="rehab-symbol">
        <Leaf size={70} strokeWidth={1} />
      </div>
      <blockquote>
        “Yol uzun olabilir. Ama tek başına yürümek zorunda değilsin.”
      </blockquote>
      <p className="rehab-doctor">DR. ECE / DESTEK DANIŞMANI</p>
      <div className="recovery-stats">
        {[
          ["İhtiyaç", s.save.craving, -45],
          ["Tolerans", s.save.tolerance, -20],
          ["Stres", s.save.stress, -30],
        ].map(([name, n, change]) => (
          <div key={String(name)}>
            <span>{name}</span>
            <b>
              {Math.round(Number(n))}
              <ArrowRight size={15} />
              {Math.max(0, Math.round(Number(n) + Number(change)))}
            </b>
          </div>
        ))}
      </div>
      <p className="story-copy">
        VEX tamamen kurgusaldır. Kullanımı geçici rahatlama sağlarken toleransı
        ve sonraki günlerin yükünü artırır. Destek görüşmesi, düzenli yemek ve
        dinlenme başka bir yol açar.
      </p>
      <Primary onClick={() => s.rehab()}>Görüşmeye katıl · 60 ₺</Primary>
    </div>
  );
}
export function CharacterPanel() {
  const s = useGame();
  const c = s.save.character;
  const palettes: {
    key: "skin" | "hair" | "shirt" | "pants" | "shoes";
    label: string;
    colors: string[];
  }[] = [
    {
      key: "skin",
      label: "Ten tonu",
      colors: ["#e0b18b", "#c99470", "#a77252", "#805338", "#573c30"],
    },
    {
      key: "hair",
      label: "Saç rengi",
      colors: ["#2b2523", "#574333", "#8b6945", "#b49a6a", "#9a9e96"],
    },
    {
      key: "shirt",
      label: "Üst kıyafet",
      colors: ["#d19260", "#6e9790", "#b8b5a4", "#9a6764", "#445d70"],
    },
    {
      key: "pants",
      label: "Alt kıyafet",
      colors: ["#374c50", "#57594f", "#7b7462", "#3a3946", "#a49c87"],
    },
    {
      key: "shoes",
      label: "Ayakkabı",
      colors: ["#e0d6be", "#463f36", "#8d6b4d", "#6e7d73", "#ba8c68"],
    },
  ];
  return (
    <div className="panel character-panel">
      <Header tag="BU HİKÂYENİN KAHRAMANI" title="Şehir seni nasıl tanısın?" />
      <div className="character-layout">
        <div
          className="character-preview"
          style={
            {
              "--skin": c.skin,
              "--hair": c.hair,
              "--shirt": c.shirt,
              "--pants": c.pants,
              "--shoes": c.shoes,
            } as React.CSSProperties
          }
        >
          <AvatarPreview character={c} />
          <span className="avatar-drag-hint">SÜRÜKLEYEREK DÖNDÜR</span>
          <div className="character-caption">
            <span>KARAYAKA SAKİNİ / 001</span>
            <h3>{c.name}</h3>
            <p>Kendi yolunu çiz.</p>
          </div>
        </div>
        <div className="character-options">
          <label className="input-label">
            KARAKTER ADI
            <input
              value={c.name}
              maxLength={20}
              onChange={(e) => s.updateCharacter({ name: e.target.value })}
              placeholder="Adını yaz"
            />
          </label>
          <div className="section-label">YÜZ HATLARI</div>
          <div className="segmented">
            {["Dengeli", "Geniş", "İnce"].map((name, i) => (
              <button
                key={i}
                className={(c.face || 0) === i ? "active" : ""}
                onClick={() => s.updateCharacter({ face: i })}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="section-label">SAÇ TARZI</div>
          <div className="segmented">
            {["Kısa", "Dalgalı", "Şapka"].map((name, i) => (
              <button
                key={i}
                className={c.style === i ? "active" : ""}
                onClick={() => s.updateCharacter({ style: i })}
              >
                {name}
              </button>
            ))}
          </div>
          {palettes.map((p) => (
            <div className="palette" key={p.key}>
              <span>{p.label}</span>
              <div>
                {p.colors.map((color) => (
                  <button
                    key={color}
                    className={c[p.key] === color ? "selected" : ""}
                    style={{ background: color }}
                    aria-label={`${p.label} ${color}`}
                    onClick={() => s.updateCharacter({ [p.key]: color })}
                  >
                    {c[p.key] === color && <Check size={15} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            className={`toggle-line ${c.accessory ? "active" : ""}`}
            onClick={() => s.updateCharacter({ accessory: !c.accessory })}
          >
            <span>Güneş gözlüğü</span>
            <i />
          </button>
          <Primary onClick={() => s.setPanel(s.playing ? "none" : "menu")}>
            Bu benim hikâyem
          </Primary>
          <p className="fine-print">
            Seçimlerin oyun içindeki 3D karakterine uygulanır.
          </p>
        </div>
      </div>
    </div>
  );
}
export function SettingsPanel() {
  const s = useGame();
  const [tab, setTab] = useState("Grafik");
  const [binding, setBinding] = useState<string | null>(null);
  useEffect(() => {
    if (!binding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === "Escape") {
        setBinding(null);
        return;
      }
      if (
        Object.entries(s.settings.keys).some(
          ([key, code]) => key !== binding && code === e.code,
        )
      ) {
        s.notify(
          "Bu tuş başka bir eyleme atanmış. Önce o atamayı değiştir.",
          "error",
        );
        return;
      }
      s.updateSettings({ keys: { ...s.settings.keys, [binding]: e.code } });
      setBinding(null);
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [binding, s]);
  const labels: Record<string, string> = {
    forward: "İleri",
    back: "Geri",
    left: "Sola",
    right: "Sağa",
    run: "Koşma",
    jump: "Zıplama",
    interact: "Etkileşim",
    inventory: "Envanter",
    map: "Harita",
    journal: "Görevler",
    phone: "Telefon",
    drop: "Eşyayı bırak",
  };
  return (
    <div className="panel settings-panel">
      <Header tag="KENDİ DÜZENİN" title="Ayarlar" />
      <div className="tabs">
        {["Grafik", "Ses", "Kontroller"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t === "Grafik" ? (
              <SlidersHorizontal size={15} />
            ) : t === "Ses" ? (
              <Volume2 size={15} />
            ) : (
              <Gamepad2 size={15} />
            )}{" "}
            {t}
          </button>
        ))}
      </div>
      {tab === "Grafik" && (
        <div className="settings-content">
          <div className="setting-line">
            <div>
              <h3>Grafik kalitesi</h3>
              <p>Gölge çözünürlüğü ve ekran örneklemesi.</p>
            </div>
            <select
              aria-label="Grafik kalitesi"
              value={s.settings.quality}
              onChange={(e) =>
                s.updateSettings({ quality: e.target.value as "high" })
              }
            >
              <option value="low">Performans</option>
              <option value="medium">Dengeli</option>
              <option value="high">Yüksek</option>
            </select>
          </div>
          <div className="setting-line">
            <div>
              <h3>Hava durumu</h3>
              <p>Otomatik hava, üçüncü günde yağmura döner.</p>
            </div>
            <select
              aria-label="Hava durumu"
              value={s.settings.weather || "auto"}
              onChange={(e) =>
                s.updateSettings({ weather: e.target.value as "auto" })
              }
            >
              <option value="auto">Otomatik</option>
              <option value="clear">Açık</option>
              <option value="rain">Yağmurlu</option>
            </select>
          </div>
          <button
            className={`toggle-line ${s.settings.reducedMotion ? "active" : ""}`}
            onClick={() =>
              s.updateSettings({ reducedMotion: !s.settings.reducedMotion })
            }
          >
            <span>Menü kamera hareketini azalt</span>
            <i />
          </button>
          <div className="settings-note">
            <Sun />
            <p>
              Gerçek zamanlı gün/gece ışığı ve yumuşak gölgeler. 1080p / 60 FPS
              hedefi donanımına göre değişir.
            </p>
          </div>
        </div>
      )}
      {tab === "Ses" && (
        <div className="settings-content">
          <div className="setting-line">
            <div>
              <h3>Ana ses seviyesi</h3>
              <p>Şehir atmosferi, adımlar ve arayüz sesleri.</p>
            </div>
            <b>%{Math.round(s.settings.volume * 100)}</b>
          </div>
          <input
            aria-label="Ses seviyesi"
            type="range"
            min="0"
            max="1"
            step=".01"
            value={s.settings.volume}
            onChange={(e) =>
              s.updateSettings({ volume: Number(e.target.value) })
            }
          />
          <button
            className="secondary"
            onClick={() => {
              audio.init();
              audio.play("success");
            }}
          >
            Sesi dene <Volume2 size={17} />
          </button>
        </div>
      )}
      {tab === "Kontroller" && (
        <div className="settings-content">
          <div className="setting-line">
            <div>
              <h3>Fare hassasiyeti</h3>
              <p>
                Sağ tuşu basılı tutarak veya sahneye tıklayarak kamerayı döndür.
              </p>
            </div>
            <b>{s.settings.sensitivity.toFixed(1)}</b>
          </div>
          <input
            aria-label="Fare hassasiyeti"
            type="range"
            min=".3"
            max="2.5"
            step=".1"
            value={s.settings.sensitivity}
            onChange={(e) =>
              s.updateSettings({ sensitivity: Number(e.target.value) })
            }
          />
          <div className="key-bindings">
            {Object.entries(labels).map(([key, label]) => (
              <button key={key} onClick={() => setBinding(key)}>
                <span>{label}</span>
                <Key>
                  {binding === key
                    ? "Bir tuşa bas…"
                    : s.settings.keys[key]
                        .replace("Key", "")
                        .replace("Left", "")}
                </Key>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export function Lobby() {
  const s = useGame();
  const [code, setCode] = useState(s.network.room);
  const [amount, setAmount] = useState(25);
  const online = s.network.status === "online";
  if (import.meta.env.VITE_STATIC_HOST === "1")
    return (
      <div className="panel lobby-panel">
        <Header
          tag="KARAYAKA WEB SÜRÜMÜ"
          title="Şehir şimdi senin."
          desc="Bu yayın, tek oyunculu macerayı ve kalıcı tarayıcı kaydını destekliyor."
        />
        <div className="lobby-offline">
          <div className="lobby-art">
            <Users size={94} strokeWidth={0.7} />
            <span>01 — 04</span>
            <p>ORTAK HİKÂYE BİR SONRAKİ BULUŞMADA.</p>
          </div>
          <div>
            <h3>Arkadaş odaları için sunuculu sürüm</h3>
            <p>
              Bu adreste oda sunucusu bulunmuyor. Tek başına şehri keşfedebilir,
              işlere başlayabilir, evini döşeyebilir ve ilerlemeni
              kaydedebilirsin.
            </p>
            <Primary onClick={() => s.setPanel(s.playing ? "none" : "menu")}>
              Maceraya dön
            </Primary>
          </div>
        </div>
      </div>
    );
  return (
    <div className="panel lobby-panel">
      <Header
        tag="AYNI ŞEHİR. ORTAK HİKÂYE."
        title="Tek başına değilsin."
        desc="En fazla dört arkadaş. Birlikte çalışın, kazancı paylaşın."
      />
      {!online ? (
        <div className="lobby-offline">
          <div className="lobby-art">
            <Users size={94} strokeWidth={0.7} />
            <span>01 — 04</span>
            <p>KARAYAKA’DA BİR YERİNİZ VAR.</p>
          </div>
          <div>
            <h3>Kendi odanı kur</h3>
            <p>
              Özel oda kodunu arkadaşlarınla paylaş. Oda karakterleri ve ekonomi
              sunucuda ayrı kaydedilir.
            </p>
            <Primary
              disabled={s.network.status === "connecting"}
              onClick={() => connectRoom("create")}
            >
              {s.network.status === "connecting"
                ? "Bağlanıyor…"
                : "Yeni oda oluştur"}
            </Primary>
            <div className="or-divider">VEYA</div>
            <label className="input-label">
              ODA KODU
              <input
                placeholder="Örn. A7C29F"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </label>
            <button
              className="secondary"
              disabled={code.length !== 6 || s.network.status === "connecting"}
              onClick={() => connectRoom("join", code)}
            >
              Odaya katıl <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="room-code">
            <div>
              <span>ÖZEL ODA KODUNUZ</span>
              <b>{s.network.room}</b>
            </div>
            <button
              className="icon-button"
              aria-label="Oda kodunu kopyala"
              onClick={() =>
                navigator.clipboard
                  .writeText(s.network.room)
                  .then(() => s.notify("Oda kodu kopyalandı."))
                  .catch(() => s.notify(`Oda kodun: ${s.network.room}`))
              }
            >
              <Copy size={20} />
            </button>
            <span className="online-indicator">
              <i />
              {s.network.peers.length + 1} / 4 ÇEVRİMİÇİ
            </span>
          </div>
          <div className="lobby-players">
            <div className="lobby-player">
              <div className="avatar-letter">{s.save.character.name[0]}</div>
              <div>
                <h3>{s.save.character.name}</h3>
                <span>Sen · Hazır</span>
              </div>
              <CheckCircle2 size={19} />
            </div>
            {s.network.peers.map((peer) => (
              <div className="lobby-player" key={peer.id}>
                <div className="avatar-letter">{peer.name[0]}</div>
                <div>
                  <h3>{peer.name}</h3>
                  <span>
                    Bağlı ·{" "}
                    {Math.round(
                      Math.hypot(
                        peer.pos[0] - s.save.pos[0],
                        peer.pos[1] - s.save.pos[1],
                      ),
                    )}{" "}
                    m
                  </span>
                </div>
                <button
                  title="Yakındayken para ver"
                  onClick={() =>
                    roomCommand("transfer", { to: peer.id, amount })
                  }
                >
                  {amount} ₺ ver
                </button>
                <button
                  onClick={() =>
                    roomCommand("loan-offer", { to: peer.id, amount })
                  }
                >
                  Borç teklif et
                </button>
                <button
                  title="Bir şişe su ver"
                  onClick={() =>
                    roomCommand("give-item", { to: peer.id, id: "water" })
                  }
                >
                  Su ver
                </button>
                <button
                  className="danger-text"
                  title="Riskli eylem: yakındaki oyuncudan 25 ₺ al; şüphe artar"
                  onClick={() => roomCommand("steal", { to: peer.id })}
                >
                  Cepten al
                </button>
              </div>
            ))}
            {Array.from({ length: 3 - s.network.peers.length }, (_, i) => (
              <div className="lobby-player empty" key={i}>
                <Plus size={23} />
                <span>Arkadaşını bekliyor</span>
              </div>
            ))}
          </div>
          <div className="shared-safe">
            <div>
              <Lock />
              <span>
                ORTAK KASA<b>{s.network.sharedCash} ₺</b>
              </span>
            </div>
            <label>
              Tutar
              <input
                type="number"
                min="1"
                max="5000"
                value={amount}
                onChange={(e) =>
                  setAmount(Math.max(1, Math.floor(Number(e.target.value))))
                }
              />
            </label>
            <button
              className="secondary"
              onClick={() => roomCommand("shared-deposit", { amount })}
            >
              Katkı yap
            </button>
            <button
              className="secondary"
              onClick={() => roomCommand("shared-withdraw", { amount })}
            >
              Kasadan al
            </button>
          </div>
          <p className="fine-print">
            Para ve eşya paylaşmak için arkadaşına yaklaş. Ortak kasadan oda
            kurucusu çekebilir. Ortak görevleri aynı odada iki kişiyle başlatın.
          </p>
          <Primary onClick={() => s.setPanel("none")}>
            Şehre birlikte gir
          </Primary>
          <button
            className="text-button danger-text"
            onClick={() => leaveRoom()}
          >
            Odadan ayrıl
          </button>
        </>
      )}
      {s.network.error && (
        <div className="error-box">
          <AlertTriangle size={18} />
          {s.network.error}
        </div>
      )}
    </div>
  );
}
export function PhonePanel() {
  const s = useGame();
  const [app, setApp] = useState<string | null>(null);
  const [contact, setContact] = useState<string | null>(null);
  const [notes, setNotes] = useState(
    () => localStorage.getItem("sondoz.notes") || "",
  );
  const apps = [
    { id: "messages", name: "Mesajlar", icon: MessageSquare },
    { id: "contacts", name: "Kişiler", icon: Users },
    { id: "jobs", name: "İş ilanları", icon: Wrench },
    { id: "map", name: "Harita", icon: MapPin },
    { id: "quests", name: "Görevler", icon: BookOpen },
    { id: "market", name: "İlan pazarı", icon: ShoppingBag },
    { id: "bank", name: "Hesaplar", icon: Banknote },
    { id: "notes", name: "Notlar", icon: Paintbrush },
    { id: "settings", name: "Ayarlar", icon: Settings },
  ];
  const time = `${Math.floor(s.save.time).toString().padStart(2, "0")}:${Math.floor(
    (s.save.time % 1) * 60,
  )
    .toString()
    .padStart(2, "0")}`;
  return (
    <div className="phone-wrap">
      <button className="phone-close" onClick={() => s.setPanel("none")}>
        Telefonu bırak <BoundKey action="phone" />
        <X size={17} />
      </button>
      <div className="phone-device">
        <div className="phone-camera" />
        <div className="phone-status">
          <b>{time}</b>
          <span>▂▄▆ · 4G · ▰</span>
        </div>
        {!app ? (
          <div className="phone-home">
            <div className="phone-clock">
              <span>{s.save.day}. GÜN · KARAYAKA</span>
              <h2>{time}</h2>
              <p>
                <Sun size={15} /> Açık · 26°
              </p>
            </div>
            <button
              className="phone-notification"
              onClick={() => setApp("messages")}
            >
              <MessageSquare size={20} />
              <div>
                <small>MESAJLAR · ŞİMDİ</small>
                <b>Nihat Abi</b>
                <span>Bir uğra, sana göre bir iş var.</span>
              </div>
              <i />
            </button>
            <div className="phone-apps">
              {apps.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    if (a.id === "map") s.setPanel("map");
                    else if (a.id === "quests" || a.id === "jobs")
                      s.setPanel("journal");
                    else if (a.id === "settings") s.setPanel("settings");
                    else setApp(a.id);
                  }}
                >
                  <span>
                    <a.icon size={25} strokeWidth={1.6} />
                  </span>
                  <small>{a.name}</small>
                </button>
              ))}
            </div>
            <div className="phone-dock">
              <span>
                <Phone size={22} />
              </span>
              <span>
                <MessageSquare size={22} />
              </span>
              <span>
                <MapPin size={22} />
              </span>
            </div>
          </div>
        ) : (
          <div className="phone-app-content">
            <button
              className="phone-back"
              onClick={() => {
                setApp(null);
                setContact(null);
              }}
            >
              <ChevronLeft size={18} />
              {apps.find((a) => a.id === app)?.name}
            </button>
            {app === "messages" && (
              <>
                <div className="message-bubble">
                  <small>NİHAT ABİ</small>
                  <p>
                    Şehre alışmak kolay değil, biliyorum. Bakkala uğra. Kolileri
                    yerleştirecek birine ihtiyacım var. Emeğinin karşılığını
                    alırsın.
                  </p>
                  <span>17.02</span>
                </div>
                {s.save.completed.length > 0 && (
                  <div className="message-bubble">
                    <small>BARAN</small>
                    <p>
                      İlk işini bitirdiğini duydum. Güzel başlangıç. Müsait
                      olunca meydanda buluşalım.
                    </p>
                    <span>{time}</span>
                  </div>
                )}
                <button
                  className="secondary"
                  onClick={() => {
                    useGame.setState({ waypoint: placeById.market.pos });
                    s.setPanel("none");
                    s.notify("Yıldız Bakkal işaretlendi.");
                  }}
                >
                  Bakkalı işaretle <MapPin size={15} />
                </button>
              </>
            )}
            {app === "contacts" && (
              <>
                {contact ? (
                  <div className="contact-profile">
                    <div className="avatar-letter">
                      {placeById[contact].npc[0]}
                    </div>
                    <h3>{placeById[contact].npc}</h3>
                    <p>{placeById[contact].role}</p>
                    <p>“{placeById[contact].dialogue}”</p>
                    <button
                      className="secondary"
                      onClick={() => {
                        useGame.setState({ waypoint: placeById[contact].pos });
                        s.notify("Konum işaretlendi.");
                      }}
                    >
                      Konumunu işaretle
                    </button>
                  </div>
                ) : (
                  places
                    .filter(
                      (p, i, a) => a.findIndex((x) => x.npc === p.npc) === i,
                    )
                    .map((p) => (
                      <button
                        className="contact-row"
                        key={p.id}
                        onClick={() => setContact(p.id)}
                      >
                        <div className="avatar-letter">{p.npc[0]}</div>
                        <div>
                          <b>{p.npc}</b>
                          <small>{p.role}</small>
                        </div>
                        <ChevronRight size={14} />
                      </button>
                    ))
                )}
              </>
            )}
            {app === "bank" && (
              <>
                <div className="phone-balance">
                  <span>YANINDAKİ NAKİT</span>
                  <b>{money(s.save.cash)} ₺</b>
                  <small>Ev kasası · {money(s.save.bank)} ₺</small>
                </div>
                <div className="phone-debt">
                  <span>Kira borcu</span>
                  <b>{s.save.debt} ₺</b>
                </div>
                <LoanLedger />
                <h4>SON HAREKETLER</h4>
                {s.save.log.length ? (
                  s.save.log.map((l, i) => (
                    <div className="transaction" key={i}>
                      {l.amount > 0 ? (
                        <ArrowDownLeft size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                      <div>
                        {l.text}
                        <small>{l.day}. gün</small>
                      </div>
                      <b>
                        {l.amount > 0 ? "+" : ""}
                        {l.amount} ₺
                      </b>
                    </div>
                  ))
                ) : (
                  <p className="fine-print">
                    İlk kazancınla birlikte hesap hareketlerin burada görünecek.
                  </p>
                )}
              </>
            )}
            {app === "market" && (
              <>
                <p className="fine-print">
                  İkinci Şans dükkânının güncel ilanları. Satın almak için
                  Hakkı’ya uğra.
                </p>
                {["chair", "plant", "lamp"].map((id) => (
                  <button
                    className="phone-listing"
                    key={id}
                    onClick={() => {
                      useGame.setState({ waypoint: placeById.pawn.pos });
                      s.notify("İkinci Şans haritada işaretlendi.");
                    }}
                  >
                    <ItemIcon id={id} size={38} />
                    <div>
                      <b>{items[id].name}</b>
                      <small>Eski Mahalle · Temiz ikinci el</small>
                      <span>{items[id].price} ₺</span>
                    </div>
                  </button>
                ))}
              </>
            )}
            {app === "notes" && (
              <>
                <p className="fine-print">
                  Aklında kalmasın. Notların bu tarayıcıda saklanır.
                </p>
                <textarea
                  aria-label="Kişisel notların"
                  value={notes}
                  placeholder="Bugün ne yapacaktım…"
                  onChange={(e) => {
                    setNotes(e.target.value);
                    localStorage.setItem("sondoz.notes", e.target.value);
                  }}
                />
                <span className="notes-saved">
                  <Check size={12} /> Otomatik kaydedildi
                </span>
              </>
            )}
          </div>
        )}
        <button
          className="phone-homebar"
          aria-label="Telefon ana ekranı"
          onClick={() => setApp(null)}
        />
      </div>
    </div>
  );
}
export function Achievements() {
  const s = useGame();
  const list = [
    { id: "first-job", title: "İlk yevmiye", desc: "İlk görevini tamamla." },
    {
      id: "ten-jobs",
      title: "Mahallenin insanı",
      desc: "10 farklı görevi tamamla.",
    },
    {
      id: "savings",
      title: "Bir kenarda dursun",
      desc: "1.000 ₺ nakit biriktir.",
    },
  ];
  return (
    <div className="panel achievements-panel">
      <Header
        tag="ŞEHİRDE BIRAKTIĞIN İZ"
        title="Küçük zaferler"
        desc={`${s.save.achievements.length} / ${list.length} başarım`}
      />
      {list.map((a, i) => (
        <div
          className={`achievement ${s.save.achievements.includes(a.id) ? "earned" : ""}`}
          key={a.id}
        >
          <div>
            <Trophy size={27} />
          </div>
          <span>0{i + 1}</span>
          <section>
            <h3>{a.title}</h3>
            <p>{a.desc}</p>
          </section>
          {s.save.achievements.includes(a.id) ? (
            <CheckCircle2 />
          ) : (
            <Lock size={17} />
          )}
        </div>
      ))}
    </div>
  );
}
export function Pause() {
  const s = useGame();
  return (
    <div className="pause-panel">
      <Eyebrow>BİR NEFES AL.</Eyebrow>
      <h2>
        Şehir
        <br />
        <em>bekleyebilir.</em>
      </h2>
      <p>
        {s.network.status === "online"
          ? "Çevrimiçi odada zaman akmaya devam eder."
          : "Tek oyunculu hikâyen duraklatıldı."}
      </p>
      <Primary onClick={() => s.setPanel("none")}>Devam et</Primary>
      <button
        onClick={() => {
          s.persist();
          s.notify(
            s.network.room
              ? "Oda ilerlemen sunucuda otomatik kaydediliyor."
              : "Hikâyen kaydedildi.",
            "success",
          );
        }}
      >
        <BookOpen size={17} /> Oyunu kaydet <ArrowUpRight size={17} />
      </button>
      <button onClick={() => s.setPanel("settings")}>
        <Settings size={17} /> Ayarlar <ArrowUpRight size={17} />
      </button>
      <button onClick={() => s.setPanel("achievements")}>
        <Trophy size={17} /> Başarımlar <ArrowUpRight size={17} />
      </button>
      <button
        onClick={() => {
          if (s.network.status === "online") leaveRoom();
          s.persist();
          s.setPanel("menu");
        }}
      >
        <Home size={17} /> Ana menü <ArrowUpRight size={17} />
      </button>
    </div>
  );
}
export function Mechanic() {
  const s = useGame();
  const m = s.mechanic!;
  const [progress, setProgress] = useState(0);
  const [hits, setHits] = useState(0);
  const [failed, setFailed] = useState(false);
  const start = useRef(performance.now());
  const holding = useRef(false);
  const value = useRef(0);
  const done = useRef(false);
  const repair = m.action === "repair";
  const difficulty = s.save.active ? questById[s.save.active.id].level : 1;
  const range = Math.max(9, 16 - difficulty);
  const [needle, setNeedle] = useState(0);
  useEffect(() => {
    if (networkCommand) networkCommand("mechanic-begin", { place: m.place });
    const down = (e: KeyboardEvent) => {
      if (e.code === useGame.getState().settings.keys.interact)
        holding.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === useGame.getState().settings.keys.interact)
        holding.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const id = setInterval(() => {
      const elapsed = (performance.now() - start.current) / 1000;
      if (repair)
        setNeedle((Math.sin(elapsed * (2.2 + difficulty * 0.18)) + 1) * 50);
      else {
        if (holding.current) {
          value.current = Math.min(
            100,
            value.current + 100 / (m.duration * 20),
          );
          setProgress(value.current);
        }
        if (value.current >= 100 && !done.current) {
          done.current = true;
          s.completeObjective(m.place, true);
        }
      }
    }, 50);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [m.place, repair]);
  const hit = () => {
    if (needle >= 50 - range && needle <= 50 + range) {
      audio.play("click");
      if (hits + 1 >= 3) {
        done.current = true;
        s.completeObjective(m.place, true);
      } else setHits(hits + 1);
    } else {
      setFailed(true);
      audio.play("error");
      setTimeout(() => setFailed(false), 900);
    }
  };
  return (
    <div className="mechanic-panel">
      <Eyebrow>
        {repair ? "USTALIK ZAMANLAMA İSTER" : "İŞİN BAŞINDASIN"}
      </Eyebrow>
      <div className="mechanic-icon">
        {repair ? (
          <Wrench size={34} />
        ) : m.action === "wait" ? (
          <Eye size={34} />
        ) : (
          <Package size={34} />
        )}
      </div>
      <h2>{m.title}</h2>
      {repair ? (
        <>
          <p>Gösterge yeşil aralıktayken sabitle. Üç başarılı ayar gerekli.</p>
          <div className={`timing-track ${failed ? "miss" : ""}`}>
            <span style={{ left: `${50 - range}%`, width: `${range * 2}%` }} />
            <i style={{ left: `${needle}%` }} />
          </div>
          <div className="timing-hits">
            {[0, 1, 2].map((i) => (
              <span className={i < hits ? "done" : ""} key={i}>
                <Check size={17} />
              </span>
            ))}
          </div>
          <button className="primary" onClick={hit}>
            <span>{failed ? "Olmadı, tekrar dene" : "Şimdi sabitle"}</span>
            <Target size={18} />
          </button>
        </>
      ) : (
        <>
          <p>
            Etkileşimi sürdürmek için <BoundKey action="interact" /> tuşunu veya
            aşağıdaki düğmeyi basılı tut.
          </p>
          <div className="work-progress">
            <i style={{ width: `${progress}%` }} />
          </div>
          <button
            className="primary hold-button"
            onPointerDown={(e) => {
              holding.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerUp={() => (holding.current = false)}
            onPointerCancel={() => (holding.current = false)}
          >
            <span>
              {progress > 0
                ? `%${Math.floor(progress)} · Devam et`
                : "Basılı tut"}
            </span>
            <Check size={18} />
          </button>
        </>
      )}
      <button
        className="text-button"
        onClick={() => useGame.setState({ mechanic: null })}
      >
        Vazgeç <Key>ESC</Key>
      </button>
    </div>
  );
}
