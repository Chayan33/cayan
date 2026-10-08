import type { Save } from "./types";
import { items } from "./world";
type Result = { save: Save; error?: string };
export function pawnItem(s: Save, item: string, id: string): Result {
  if (!items[item] || !s.inventory[item])
    return { save: s, error: "Rehin bırakabileceğin böyle bir eşya yok." };
  if (["vex", "food", "water", "tea", "medkit"].includes(item))
    return { save: s, error: "Tüketim ürünleri rehin alınmaz." };
  const advance = Math.floor(items[item].price * 0.6),
    redemption = Math.ceil(advance * 1.1);
  return {
    save: {
      ...s,
      cash: s.cash + advance,
      inventory: { ...s.inventory, [item]: s.inventory[item] - 1 },
      pawnTickets: [
        ...s.pawnTickets,
        { id, item, advance, redemption, dueDay: s.day + 3 },
      ],
      log: [
        { text: `${items[item].name} rehni`, amount: advance, day: s.day },
        ...s.log,
      ].slice(0, 50),
    },
  };
}
export function redeemPawn(s: Save, id: string): Result {
  const ticket = s.pawnTickets.find((t) => t.id === id);
  if (!ticket) return { save: s, error: "Rehin kaydı bulunamadı." };
  if (s.day > ticket.dueDay)
    return {
      save: s,
      error: "Rehin süresi doldu; eşya dükkânın stokuna geçti.",
    };
  if (s.cash < ticket.redemption)
    return { save: s, error: "Geri almak için yeterli nakit yok." };
  return {
    save: {
      ...s,
      cash: s.cash - ticket.redemption,
      inventory: {
        ...s.inventory,
        [ticket.item]: (s.inventory[ticket.item] || 0) + 1,
      },
      pawnTickets: s.pawnTickets.filter((t) => t.id !== id),
      log: [
        {
          text: `${items[ticket.item].name} geri alındı`,
          amount: -ticket.redemption,
          day: s.day,
        },
        ...s.log,
      ].slice(0, 50),
    },
  };
}
