import type { Place } from "./types";
export const places: Place[] = [
  {
    id: "market",
    name: "Yıldız Bakkal",
    npc: "Nihat Abi",
    role: "Mahallenin bakkalı",
    pos: [11, -10],
    district: "Eski Mahalle",
    color: "#d48a5c",
    dialogue:
      "Sabah erkenden gelen kamyon yine kolileri kapıya bırakmış. İstersen bir el at, yevmiyeni akşama kalmadan veririm. Burada önce işini düzgün yaparsın, sonra herkes adını öğrenir.",
    kind: "shop",
  },
  {
    id: "home",
    name: "Ev · 3 Numara",
    npc: "Melek Teyze",
    role: "Ev sahibi",
    pos: [-11, 18],
    district: "Eski Mahalle",
    color: "#92a995",
    dialogue:
      "Çatı akmıyor, sıcak su var. Şimdilik bu oda sana yeter. Kiranı gününde getir; başın sıkışırsa önce benimle konuş.",
    kind: "home",
  },
  {
    id: "stock",
    name: "Bakkalın deposu",
    npc: "Elif",
    role: "Market çalışanı",
    pos: [12, -22],
    district: "Çarşı",
    color: "#c5a97b",
    dialogue:
      "Kolinin üstündeki etikete bak. Gıdayı serin rafa, temizlik ürününü ayrı bölüme koyuyoruz. Acele edip karıştırma.",
    kind: "work",
  },
  {
    id: "shelf",
    name: "Bakkal · Raflar",
    npc: "Nihat Abi",
    role: "Sipariş teslimi",
    pos: [12, -5],
    district: "Eski Mahalle",
    color: "#d48a5c",
    dialogue:
      "Tam zamanında. Önce rafları dolduralım; müşteriler birazdan gelir.",
    kind: "work",
  },
  {
    id: "warehouse",
    name: "Rıhtım Deposu",
    npc: "Cem",
    role: "Depo sorumlusu",
    pos: [59, -53],
    district: "Sanayi",
    color: "#b29b72",
    dialogue:
      "Burada her kolinin bir kaydı, her kaydın bir adresi var. Yanlış teslimat ikimizin de gününü yakar. Hazırsan başlayalım.",
    kind: "work",
  },
  {
    id: "garage",
    name: "Kaya Oto",
    npc: "Usta Rıza",
    role: "Tamirci",
    pos: [59, -32],
    district: "Sanayi",
    color: "#7d9694",
    dialogue:
      "Bir işi öğrenmenin yolu önce dinlemek. Aleti sırayla kullan, yeşil aralıkta durdur. Telaşla yapılan tamir geri döner.",
    kind: "work",
  },
  {
    id: "cafe",
    name: "Kıyı Kahvesi",
    npc: "Derya",
    role: "Kafe işletmecisi",
    pos: [-11, -53],
    district: "Sahil",
    color: "#d9b79b",
    dialogue:
      "Akşama masalar dolacak. Sahilin sessizliğine aldanma, burada dakikalar önemlidir. Yardım edersen emeğinin karşılığını alırsın.",
    kind: "shop",
  },
  {
    id: "beach",
    name: "Sahil Yürüyüş Yolu",
    npc: "Deniz",
    role: "Çevre gönüllüsü",
    pos: [-42, -78],
    district: "Sahil",
    color: "#80b1ac",
    dialogue:
      "Herkes denize bakıyor ama kimse arkasında bıraktığına bakmıyor. Sahili birlikte toparlayabiliriz.",
    kind: "point",
  },
  {
    id: "square",
    name: "Saat Meydanı",
    npc: "Baran",
    role: "Çocukluk arkadaşın",
    pos: [0, -43],
    district: "Çarşı",
    color: "#b9b9a4",
    dialogue:
      "Bu şehir hepimize bir şey borçlu gibi geliyor. Ama borcu ondan nasıl alacağımıza biz karar vereceğiz. Önce ayaklarımızın üzerinde duralım.",
    kind: "work",
  },
  {
    id: "police",
    name: "Karayaka Karakolu",
    npc: "Komiser Selim",
    role: "Mahalle komiseri",
    pos: [11, 50],
    district: "Merkez",
    color: "#7192a1",
    dialogue:
      "Bir sorun varsa konuşuruz. Ama başkasının emeğine el uzatırsan bunun karşılığı olur. Mahallede gözümüz açık.",
    kind: "police",
  },
  {
    id: "clinic",
    name: "Yaşam Danışma Merkezi",
    npc: "Dr. Ece",
    role: "Destek danışmanı",
    pos: [-11, 50],
    district: "Merkez",
    color: "#92b6a1",
    dialogue:
      "Her gün yeniden başlayabilirsin. Destek almak zayıflık değil. Dinlenme, düzenli yemek ve bir plan; beraber adım adım ilerleyelim.",
    kind: "clinic",
  },
  {
    id: "alley",
    name: "Arka Geçit",
    npc: "Koral",
    role: "Gece işleri",
    pos: [59, 18],
    district: "Arka Sokaklar",
    color: "#a07492",
    dialogue:
      "Herkes kolay para ister, kimse sonucunu sormaz. Sana vereceğim iş riskli. İstemiyorsan dön; şehirde başka yollar da var.",
    kind: "work",
  },
  {
    id: "pawn",
    name: "İkinci Şans",
    npc: "Hakkı",
    role: "İkinci el ve rehin",
    pos: [11, 21],
    district: "Eski Mahalle",
    color: "#c5aa68",
    dialogue:
      "Her eşyanın bir hikâyesi var. Ben hikâyeye değil, durumuna bakarım. Temiz getir, hakkını vereyim.",
    kind: "shop",
  },
  {
    id: "construction",
    name: "Yeni Yapı Şantiyesi",
    npc: "Fikret",
    role: "Şantiye şefi",
    pos: [-58, 19],
    district: "Yenişehir",
    color: "#d3a461",
    dialogue:
      "Malzeme zamanında gelirse herkes evine zamanında gider. Yükü tek başına zorlamayın; ağır iş ortak yapılır.",
    kind: "work",
  },
  {
    id: "residence",
    name: "Defne Apartmanı",
    npc: "Aslı",
    role: "Apartman yöneticisi",
    pos: [-58, -31],
    district: "Yenişehir",
    color: "#c8c9b1",
    dialogue:
      "Komşular birbirini tanımıyor artık. Belki bir teslimat, belki küçük bir yardım bunu değiştirir.",
    kind: "work",
  },
  {
    id: "bus",
    name: "Çınar Durağı",
    npc: "Ozan",
    role: "Belediye görevlisi",
    pos: [4, 33],
    district: "Merkez",
    color: "#88a7ad",
    dialogue:
      "Seferler bitmeden durakları kontrol edelim. Küçük bir aksaklık bütün hattı etkiliyor.",
    kind: "work",
  },
  {
    id: "harbor",
    name: "Eski İskele",
    npc: "Kaptan Yalçın",
    role: "İskele sorumlusu",
    pos: [49, -78],
    district: "Sanayi",
    color: "#93a9a2",
    dialogue:
      "Deniz acele edeni sevmez. Halatları kontrol et, yükleri say. Sonra yola çıkılır.",
    kind: "work",
  },
];
export const placeById = Object.fromEntries(places.map((p) => [p.id, p]));
export const districts = [
  { name: "Eski Mahalle", pos: [0, 15], n: "01" },
  { name: "Çarşı", pos: [0, -24], n: "02" },
  { name: "Sanayi", pos: [55, -48], n: "03" },
  { name: "Sahil", pos: [-20, -76], n: "04" },
  { name: "Yenişehir", pos: [-52, -20], n: "05" },
  { name: "Arka Sokaklar", pos: [53, 20], n: "06" },
  { name: "Merkez", pos: [0, 49], n: "07" },
];
export function districtAt(x: number, z: number) {
  return [...districts].sort(
    (a, b) =>
      Math.hypot(x - a.pos[0], z - a.pos[1]) -
      Math.hypot(x - b.pos[0], z - b.pos[1]),
  )[0].name;
}
export const items: Record<
  string,
  { name: string; desc: string; price: number; icon: string; effect?: string }
> = {
  water: {
    name: "İçme suyu",
    desc: "Temiz bir nefes. +15 enerji.",
    price: 12,
    icon: "water",
    effect: "energy",
  },
  food: {
    name: "Peynirli sandviç",
    desc: "Nihat Abi’nin günlük hazırladığı. +35 tokluk.",
    price: 35,
    icon: "food",
    effect: "hunger",
  },
  tea: {
    name: "Demli çay",
    desc: "Bir mola iyi gelir. −15 stres, +10 enerji.",
    price: 15,
    icon: "tea",
    effect: "stress",
  },
  medkit: {
    name: "İlk yardım çantası",
    desc: "Ufak yaralanmalar için. +40 sağlık.",
    price: 90,
    icon: "medkit",
    effect: "health",
  },
  vex: {
    name: "VEX",
    desc: "Kurgusal madde. İhtiyacı geçici azaltır; toleransı ve masrafı artırır.",
    price: 110,
    icon: "vex",
    effect: "craving",
  },
  chair: {
    name: "Ahşap sandalye",
    desc: "Evinde yerleştirebileceğin, elden geçirilmiş bir sandalye.",
    price: 180,
    icon: "chair",
  },
  plant: {
    name: "Kauçuk bitkisi",
    desc: "Odanı biraz daha ev yapan bir yeşillik.",
    price: 120,
    icon: "plant",
  },
  lamp: {
    name: "Ayaklı lamba",
    desc: "Akşamları sıcak bir ışık.",
    price: 240,
    icon: "lamp",
  },
  mask: {
    name: "Bez maske",
    desc: "Riskli işlerde tanınma hızını azaltır.",
    price: 85,
    icon: "mask",
  },
};
