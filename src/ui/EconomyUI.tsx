import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock,
  Coins,
  HandCoins,
  Lock,
  Package,
  ReceiptText,
  X,
} from "lucide-react";
import { useGame, networkCommand } from "../game/store";
import { pawnItem, redeemPawn } from "../game/economy";
import { roomCommand } from "../game/network";
import { items } from "../game/world";
import { ItemIcon } from "./components";
export function PawnShop() {
  const s = useGame();
  const eligible = Object.keys(s.save.inventory).filter(
    (id) =>
      s.save.inventory[id] > 0 &&
      ["chair", "lamp", "plant", "mask"].includes(id),
  );
  function transaction(action: "pawn" | "redeem", id: string) {
    if (networkCommand) {
      networkCommand(action, { id });
      return;
    }
    const result =
      action === "pawn"
        ? pawnItem(s.save, id, crypto.randomUUID())
        : redeemPawn(s.save, id);
    if (result.error) return s.notify(result.error, "error");
    useGame.setState({ save: result.save });
    s.persist();
    s.notify("Rehin kaydı güncellendi.", "success");
  }
  return (
    <div className="pawn-layout">
      <div className="pawn-info">
        <ReceiptText size={34} />
        <div>
          <h3>Eşyanı satmadan bir nefes al.</h3>
          <p>
            Eşyanın değerinin %60’ını al. Üç oyun günü içinde %10 hizmet
            bedeliyle geri alabilirsin. Süre dolarsa eşya dükkâna kalır.
          </p>
        </div>
      </div>
      <div className="section-label">REHİN BIRAKABİLECEĞİN EŞYALAR</div>
      {eligible.length ? (
        <div className="pawn-offers">
          {eligible.map((id) => (
            <button key={id} onClick={() => transaction("pawn", id)}>
              <ItemIcon id={id} size={30} />
              <span>
                <b>{items[id].name}</b>
                <small>{s.save.inventory[id]} adet sende</small>
              </span>
              <strong>+{Math.floor(items[id].price * 0.6)} ₺</strong>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
      ) : (
        <p className="fine-print">
          Şu anda rehin bırakılabilecek bir eşyan yok. Mobilya ve aksesuarlar
          kabul edilir.
        </p>
      )}
      <div className="section-label">
        REHİN FİŞLERİN <span>{s.save.pawnTickets.length} KAYIT</span>
      </div>
      {s.save.pawnTickets.length ? (
        s.save.pawnTickets.map((t) => (
          <div
            className={`pawn-ticket ${s.save.day > t.dueDay ? "expired" : ""}`}
            key={t.id}
          >
            <div className="ticket-perforation" />
            <ReceiptText size={24} />
            <div>
              <h3>{items[t.item].name}</h3>
              <p>
                Alınan nakit: {t.advance} ₺ · Son gün: {t.dueDay}. gün
              </p>
              <small>
                {s.save.day > t.dueDay
                  ? "Süresi doldu; eşya dükkâna geçti."
                  : `${t.dueDay - s.save.day} oyun günü kaldı`}
              </small>
            </div>
            <button
              disabled={s.save.day > t.dueDay}
              onClick={() => transaction("redeem", t.id)}
            >
              {t.redemption} ₺ · Geri al <ArrowDownLeft size={15} />
            </button>
          </div>
        ))
      ) : (
        <p className="fine-print">
          Rehin bıraktığın eşyaların fişleri burada saklanır.
        </p>
      )}
    </div>
  );
}
export function LoanLedger() {
  const s = useGame();
  if (!s.network.room) return null;
  const loans = s.network.loans.filter((l) => l.status !== "declined");
  return (
    <section className="loan-ledger">
      <h4>BORÇ DEFTERİ</h4>
      {loans.length ? (
        loans.map((l) => {
          const borrower = l.to === s.network.id;
          const other =
            s.network.peers.find((p) => p.id === (borrower ? l.from : l.to))
              ?.name || "Arkadaşın";
          const remaining = l.amount - l.repaid;
          return (
            <div className="loan-entry" key={l.id}>
              <div className="loan-entry-top">
                <HandCoins size={18} />
                <b>{other}</b>
                <span>
                  {l.status === "offered"
                    ? "TEKLİF"
                    : l.status === "paid"
                      ? "KAPANDI"
                      : borrower
                        ? "BORCUN"
                        : "ALACAĞIN"}
                </span>
              </div>
              <div className="loan-amount">
                {l.status === "paid" ? l.amount : remaining} ₺
                <small>
                  {l.status === "paid"
                    ? "Tamamı ödendi"
                    : `Faizsiz · Vade ${l.dueDay}. gün`}
                </small>
              </div>
              {l.status === "offered" && borrower ? (
                <div className="loan-actions">
                  <button
                    onClick={() => roomCommand("loan-accept", { id: l.id })}
                  >
                    <Check size={13} />
                    Kabul et
                  </button>
                  <button
                    onClick={() => roomCommand("loan-decline", { id: l.id })}
                  >
                    <X size={13} />
                    Reddet
                  </button>
                </div>
              ) : l.status === "offered" ? (
                <button
                  className="text-button"
                  onClick={() => roomCommand("loan-decline", { id: l.id })}
                >
                  Teklifi geri çek
                </button>
              ) : l.status === "active" && borrower ? (
                <div className="loan-actions">
                  <button
                    disabled={s.save.cash < Math.min(25, remaining)}
                    onClick={() =>
                      roomCommand("loan-repay", {
                        id: l.id,
                        amount: Math.min(25, remaining),
                      })
                    }
                  >
                    {Math.min(25, remaining)} ₺ öde
                  </button>
                  <button
                    disabled={s.save.cash < remaining}
                    onClick={() =>
                      roomCommand("loan-repay", { id: l.id, amount: remaining })
                    }
                  >
                    Tamamını öde
                  </button>
                </div>
              ) : null}
              {l.status === "active" && s.save.day > l.dueDay && (
                <small className="danger-text">
                  Vade geçti. Arkadaşınla konuşup hesabı kapat.
                </small>
              )}
            </div>
          );
        })
      ) : (
        <p className="fine-print">
          Oda ekranından arkadaşına borç teklif edebilirsin. Para, teklifi kabul
          ettiğinde aktarılır.
        </p>
      )}
    </section>
  );
}
