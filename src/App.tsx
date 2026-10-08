import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  CloudSun,
  Compass,
  Gamepad2,
  Heart,
  MapPin,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Mouse,
  Package,
  Play,
  Settings,
  Shield,
  Signal,
  Sun,
  Users,
  Volume2,
  VolumeX,
  Wheat,
  Zap,
  FlaskConical,
  Clock,
  Lock,
  BookOpen,
  Phone,
  Backpack,
  Home,
  Trophy,
  LoaderCircle,
} from "lucide-react";
import { GameEngine } from "./game/engine";
import { useGame } from "./game/store";
import { questById, levelFromXP } from "./game/quests";
import { districtAt, placeById, districts } from "./game/world";
import { audio } from "./game/audio";
import {
  BoundKey,
  keyName,
  Close,
  Eyebrow,
  GameMap,
  Key,
  Mark,
  Stat,
} from "./ui/components";
import {
  Achievements,
  CharacterPanel,
  Dialogue,
  HomePanel,
  Inventory,
  Journal,
  Lobby,
  MapPanel,
  Mechanic,
  Pause,
  PhonePanel,
  Rehab,
  SettingsPanel,
  Shop,
} from "./ui/Panels";
import "./styles.css";
const panels = {
  inventory: Inventory,
  map: MapPanel,
  journal: Journal,
  phone: PhonePanel,
  settings: SettingsPanel,
  character: CharacterPanel,
  lobby: Lobby,
  dialogue: Dialogue,
  shop: Shop,
  home: HomePanel,
  rehab: Rehab,
  achievements: Achievements,
  pause: Pause,
};
function Scene() {
  const ref = useRef<HTMLDivElement>(null);
  const engine = useRef<GameEngine | null>(null);
  const quality = useGame((s) => s.settings.quality);
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive || !ref.current) return;
      try {
        engine.current = new GameEngine(ref.current);
        if (import.meta.env.DEV)
          (
            window as unknown as {
              __SONDOZ: { store: typeof useGame; engine: GameEngine };
            }
          ).__SONDOZ = { store: useGame, engine: engine.current };
      } catch (error) {
        useGame.setState({
          renderError:
            error instanceof Error ? error.message : "3D motoru başlatılamadı.",
        });
      }
    });
    return () => {
      alive = false;
      engine.current?.dispose();
    };
  }, []);
  useEffect(() => engine.current?.applyQuality(), [quality]);
  return <div className="game-scene" ref={ref} />;
}
function MainMenu() {
  const s = useGame();
  const [confirmNew, setConfirmNew] = useState(false);
  const [exit, setExit] = useState(false);
  return (
    <main className="main-menu">
      <header className="menu-header">
        <div className="wordmark">
          <Mark />
          <span>
            SON DOZ<small>KARAYAKA HİKÂYELERİ</small>
          </span>
        </div>
        <div className="menu-top-right">
          <span className="build-tag">
            <i /> GELİŞTİRME SÜRÜMÜ 0.1
          </span>
          <button
            className="circle-button"
            aria-label="Ses aç veya kapat"
            onClick={() => {
              audio.init();
              s.updateSettings({ volume: s.settings.volume ? 0 : 0.35 });
            }}
          >
            {s.settings.volume ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button
            className="circle-button"
            aria-label="Ayarlar"
            onClick={() => s.setPanel("settings")}
          >
            <Settings size={17} />
          </button>
        </div>
      </header>
      <section className="menu-main">
        <div className="title-kicker">
          <span>36° 48′ K</span>
          <i />
          <span>AKDENİZ’İN ÖTEKİ YÜZÜ</span>
        </div>
        <div className="game-title" aria-label="SON DOZ">
          <span>SON</span>
          <span>
            DOZ
            <span className="title-star">
              <svg viewBox="0 0 44 44">
                <path
                  d="M22 1V43M1 22H43M7 7L37 37M7 37L37 7"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
            </span>
          </span>
          <div className="title-index">
            BİR ŞEHİR.
            <br />
            BİN İHTİMAL.
          </div>
        </div>
        <p className="menu-intro">
          Her kazancın bir bedeli.
          <br />
          Her kararın bir <em>sonrası.</em>
        </p>
        <div className="main-actions">
          <button
            className="start-button"
            onClick={() => (s.hasSave ? setConfirmNew(true) : s.newGame())}
          >
            <span className="start-icon">
              <Play size={17} fill="currentColor" />
            </span>
            <span>
              Yeni oyun<small>HİKÂYEN BURADA BAŞLIYOR</small>
            </span>
            <ArrowUpRight size={24} />
          </button>
          <button
            className={`menu-link ${!s.hasSave ? "unavailable" : ""}`}
            disabled={!s.hasSave}
            onClick={() => s.loadGame()}
          >
            <Bookmark size={18} />
            <span>Devam et</span>
            {s.hasSave ? <ArrowUpRight size={16} /> : <small>KAYIT YOK</small>}
          </button>
          <button className="menu-link" onClick={() => s.setPanel("lobby")}>
            <Users size={19} />
            <span>Arkadaşlarla oyna</span>
            <small>2–4 OYUNCU</small>
          </button>
          <div className="menu-secondary">
            <button onClick={() => s.setPanel("character")}>
              Karakter <ArrowUpRight size={12} />
            </button>
            <i />
            <button onClick={() => s.setPanel("settings")}>
              Ayarlar <ArrowUpRight size={12} />
            </button>
            <i />
            <button onClick={() => setExit(true)}>
              Çıkış <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
      </section>
      <aside className="scene-info">
        <div className="weather-line">
          <Sun size={19} strokeWidth={1.2} />
          <span>17.24</span>
          <i />
          <span>26°</span>
          <span className="live-dot" />
        </div>
        <div className="district-card">
          <div className="district-topline">
            <span>ŞEHİRDEN BİR KARE</span>
            <span>01 / 07</span>
          </div>
          <h2>Eski Mahalle</h2>
          <div className="district-description">
            <span className="vertical-line" />
            <p>
              Herkesin birbirini tanıdığı,
              <br />
              kimsenin her şeyi bilmediği sokaklar.
            </p>
          </div>
          <div className="district-bottom">
            <span>
              <MapPin size={12} /> KARAYAKA
            </span>
            <div>
              <i className="active" />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
        <div className="world-status">
          <span className="status-dot" /> GERÇEK ZAMANLI 3D DÜNYA <span>↗</span>
        </div>
      </aside>
      <footer className="menu-footer">
        <span className="footer-studio">
          <Mark /> BAŞKA BİR HAYAT MÜMKÜN.
        </span>
        <span className="footer-controls">
          <Gamepad2 size={15} /> KLAVYE + FARE İLE OYNANIR
        </span>
        <span>
          © 2026 SON DOZ <i /> KARAYAKA SENİ BEKLİYOR.
        </span>
      </footer>
      {confirmNew && (
        <div className="confirmation-backdrop">
          <div className="confirmation">
            <Eyebrow>YENİ BİR SAYFA</Eyebrow>
            <h2>Baştan başlayalım mı?</h2>
            <p>
              Bu tarayıcıdaki tek oyunculu kaydın yeni hikâyeyle değiştirilecek.
              Oda kayıtları sunucuda kalır.
            </p>
            <button
              className="primary"
              onClick={() => {
                setConfirmNew(false);
                s.newGame();
              }}
            >
              <span>Yeni hikâyeye başla</span>
              <ArrowUpRight />
            </button>
            <button className="secondary" onClick={() => setConfirmNew(false)}>
              Kaydı koru, geri dön
            </button>
          </div>
        </div>
      )}
      {exit && (
        <div className="confirmation-backdrop">
          <div className="confirmation">
            <Eyebrow>KARAYAKA BURADA KALACAK.</Eyebrow>
            <h2>Sonra görüşürüz.</h2>
            <p>
              Çıkmak için bu tarayıcı sekmesini kapatabilirsin. Kaydın bir
              sonraki ziyaretinde seni bekleyecek.
            </p>
            <button className="primary" onClick={() => setExit(false)}>
              <span>Menüye dön</span>
              <ArrowRight />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
function HUD() {
  const s = useGame();
  const active = s.save.active;
  const q = active ? questById[active.id] : null;
  const obj = active ? q!.stages[active.stage] : null;
  const target = obj ? placeById[obj.place] : placeById.market;
  const district = s.interior ? "Çınar Apartmanı" : districtAt(...s.save.pos);
  const time = `${Math.floor(s.save.time).toString().padStart(2, "0")}.${Math.floor(
    (s.save.time % 1) * 60,
  )
    .toString()
    .padStart(2, "0")}`;
  const dist = Math.round(
    Math.hypot(s.save.pos[0] - target.pos[0], s.save.pos[1] - target.pos[1]),
  );
  const nearby =
    s.nearby && s.nearby !== "dropped" ? placeById[s.nearby] : null;
  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-location">
          <span className="hud-logo">
            <Mark />
          </span>
          <div>
            <small>KARAYAKA / {String(s.save.day).padStart(2, "0")}. GÜN</small>
            <h2>{district}</h2>
          </div>
          <span className="location-divider" />
          <div className="hud-time">
            <Sun size={16} />
            {time}
          </div>
        </div>
        <div className="hud-cash">
          <span>CEBİNDEKİ HAYAT</span>
          <b>
            {s.save.cash.toLocaleString("tr-TR")} <small>₺</small>
          </b>
          <div>
            <span>SEVİYE {levelFromXP(s.save.xp)}</span>
            <i>•</i>
            <span>{s.save.xp} DP</span>
          </div>
        </div>
      </div>
      <div className="hud-quest">
        <div className="hud-quest-heading">
          <span className="quest-diamond" />
          <span>{q ? q.category.toLocaleUpperCase("tr-TR") : "İLK ADIM"}</span>
          <button
            aria-label="Görev günlüğü"
            onClick={() => s.setPanel("journal")}
          >
            <BoundKey action="journal" />
          </button>
        </div>
        <h3>{q ? q.title : "Şehir seni bekliyor."}</h3>
        <p>{obj ? obj.text : "Yıldız Bakkal’a git, Nihat Abi ile tanış."}</p>
        <div className="hud-quest-distance">
          <MapPin size={12} />
          {target.name}
          <span>{dist} m</span>
        </div>
        {q && (
          <div className="quest-stage-bars">
            {q.stages.map((_, i) => (
              <i key={i} className={i <= active!.stage ? "filled" : ""} />
            ))}
          </div>
        )}
        {q?.minutes && (
          <small className="quest-timer">
            <Clock size={12} />
            {Math.ceil(q.minutes * 60 - active!.elapsed)} sn kaldı
          </small>
        )}
      </div>
      {s.save.suspicion > 8 && (
        <div className="suspicion-hud">
          <Shield size={18} />
          <div>
            <span>
              {s.save.suspicion > 60 ? "ARANIYORSUN" : "POLİS ŞÜPHESİ"}
            </span>
            <div>
              <i style={{ width: `${s.save.suspicion}%` }} />
            </div>
          </div>
          <b>{Math.round(s.save.suspicion)}%</b>
        </div>
      )}
      <div className="hud-bottom-left">
        <button
          className="minimap-button"
          aria-label="Haritayı aç"
          onClick={() => s.setPanel("map")}
        >
          <GameMap mini />
          <div className="minimap-bottom">
            <span>{district.toLocaleUpperCase("tr-TR")}</span>
            <BoundKey action="map" />
          </div>
        </button>
        <div className="hud-stats">
          <Stat
            label="Sağlık"
            value={s.save.health}
            icon={<Heart size={15} />}
          />
          <Stat label="Enerji" value={s.save.energy} icon={<Zap size={15} />} />
          <Stat
            label="Tokluk"
            value={s.save.hunger}
            icon={<Wheat size={15} />}
            color="gold"
          />
          <Stat
            label="İhtiyaç"
            value={s.save.craving}
            icon={<FlaskConical size={15} />}
            color="rust"
          />
        </div>
      </div>
      <div className="hud-bottom-center">
        {s.decorating ? (
          <div className="interaction">
            <span className="interact-key">
              {keyName(s.settings.keys.interact)}
            </span>
            <div>
              <b>Eşyayı yerleştir</b>
              <small>R: Döndür · ESC: Vazgeç</small>
            </div>
          </div>
        ) : s.interior ? (
          <div className="interaction">
            <span className="interact-key">
              {keyName(s.settings.keys.interact)}
            </span>
            <div>
              <b>Evini yönet / Kapıdan çık</b>
              <small>İçeride dinlen, kapıya yaklaşarak dışarı çık.</small>
            </div>
          </div>
        ) : s.nearby ? (
          <button className="interaction" onClick={() => s.interact()}>
            <span className="interact-key">
              {keyName(s.settings.keys.interact)}
            </span>
            <div>
              <b>
                {s.nearby === "dropped"
                  ? "Koliyi geri al"
                  : obj?.place === s.nearby
                    ? obj.text
                    : `${nearby?.npc} ile konuş`}
              </b>
              <small>{nearby?.name || "Bıraktığın görev eşyası"}</small>
            </div>
            <ChevronRight size={19} />
          </button>
        ) : (
          <div className="movement-help">
            <span>
              <Key>
                {["forward", "left", "back", "right"]
                  .map((a) => keyName(s.settings.keys[a]))
                  .join(" ")}
              </Key>{" "}
              Yürü
            </span>
            <span>
              <BoundKey action="run" /> Koş
            </span>
            <span>
              <Mouse size={13} /> Kamerayı döndür
            </span>
          </div>
        )}
        {s.save.carrying && (
          <div className="carrying-badge">
            <Package size={14} /> Koli taşıyorsun <BoundKey action="drop" />{" "}
            bırak
          </div>
        )}
      </div>
      <div className="hud-shortcuts">
        <button onClick={() => s.setPanel("phone")} aria-label="Telefon">
          <Phone size={19} />
          <BoundKey action="phone" />
        </button>
        <button onClick={() => s.setPanel("inventory")} aria-label="Envanter">
          <Backpack size={19} />
          <BoundKey action="inventory" />
        </button>
        <button onClick={() => s.setPanel("journal")} aria-label="Görevler">
          <BookOpen size={19} />
          <BoundKey action="journal" />
        </button>
        <button onClick={() => s.setPanel("pause")} aria-label="Duraklat">
          <Menu size={19} />
          <Key>ESC</Key>
        </button>
      </div>
      {s.network.status === "online" && (
        <button className="hud-room" onClick={() => s.setPanel("lobby")}>
          <Users size={16} />
          {s.network.peers.length + 1}/4 · {s.network.room}
          <span className="status-dot" />
        </button>
      )}
      {s.waypoint && (
        <div className="waypoint-hud">
          <Compass size={14} /> İşaretli konum:{" "}
          {Math.round(
            Math.hypot(
              s.waypoint[0] - s.save.pos[0],
              s.waypoint[1] - s.save.pos[1],
            ),
          )}{" "}
          m
        </div>
      )}
    </div>
  );
}
export default function App() {
  const s = useGame();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.fonts.ready.then(() => setReady(true));
    audio.setVolume(s.settings.volume);
  }, []);
  useEffect(() => {
    if (!s.toast) return;
    const id = setTimeout(() => useGame.setState({ toast: null }), 6200);
    return () => clearTimeout(id);
  }, [s.toast?.key]);
  const Panel = panels[s.panel as keyof typeof panels];
  return (
    <div
      className={`app ${s.panel === "menu" ? "at-menu" : ""} ${s.settings.reducedMotion ? "reduced-motion" : ""}`}
    >
      <Scene />
      <div className="scene-vignette" />
      <div className="film-grain" />
      {!ready && (
        <div className="loading-screen">
          <Mark />
          <h1>SON DOZ</h1>
          <LoaderCircle className="spin" />
          <p>Karayaka uyanıyor…</p>
        </div>
      )}
      {s.panel === "menu" ? (
        <MainMenu />
      ) : (
        <>
          {s.playing && <HUD />}
          {Panel && (
            <div
              className={`panel-layer ${s.panel === "phone" ? "phone-layer" : ""} ${s.panel === "dialogue" ? "dialogue-layer" : ""}`}
            >
              <Panel />
            </div>
          )}
        </>
      )}
      {s.mechanic && (
        <div className="panel-layer mechanic-layer">
          <Mechanic key={`${s.mechanic.place}-${s.save.active?.stage}`} />
        </div>
      )}
      {s.toast && (
        <div className={`toast ${s.toast.type}`} role="status">
          <span>
            {s.toast.type === "success" ? (
              <Check size={20} />
            ) : s.toast.type === "error" ? (
              <Shield size={20} />
            ) : (
              <MessageSquare size={19} />
            )}
          </span>
          <div>
            <small>
              {s.toast.type === "success"
                ? "BİR ADIM DAHA"
                : s.toast.type === "error"
                  ? "DİKKAT"
                  : "KARAYAKA’DAN HABER"}
            </small>
            <p>{s.toast.text}</p>
          </div>
          <button
            aria-label="Bildirimi kapat"
            onClick={() => useGame.setState({ toast: null })}
          >
            ×
          </button>
          <i />
        </div>
      )}
      {s.renderError && (
        <div className="render-error">
          <h2>3D dünya başlatılamadı.</h2>
          <p>
            WebGL destekli güncel bir tarayıcı ve donanım hızlandırması
            gerekiyor.
          </p>
          <small>{s.renderError}</small>
          <button className="primary" onClick={() => location.reload()}>
            Yeniden dene
          </button>
        </div>
      )}
      <div className="small-screen-note">
        <Gamepad2 />
        <span>
          En iyi deneyim için masaüstü bilgisayar, klavye ve fare kullan.
        </span>
      </div>
    </div>
  );
}
