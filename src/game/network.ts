import { io, type Socket } from "socket.io-client";
import { useGame, bindNetworkCommand } from "./store";
import type { Save, Peer, SharedHouse, Loan } from "./types";
import { initialSave, validateSave } from "./model";
function tokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("sondoz.room-tokens") || "{}");
  } catch {
    return {};
  }
}
let socket: Socket | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
export function connectRoom(mode: "create" | "join", code = "") {
  if (socket) socket.disconnect();
  const s = useGame.getState();
  useGame.setState({
    network: { ...s.network, status: "connecting", error: "" },
  });
  socket = io({
    transports: ["websocket", "polling"],
    timeout: 6000,
    reconnectionAttempts: 6,
  });
  let connectedCode = mode === "join" ? code.toUpperCase().trim() : "";
  socket.on("connect", () =>
    socket!.emit(connectedCode ? "join" : "create", {
      code: connectedCode,
      character: useGame.getState().save.character,
      token: tokens()[connectedCode] || useGame.getState().network.recoverToken,
    }),
  );
  socket.on("connect_error", () => {
    useGame.setState((st) => ({
      network: {
        ...st.network,
        status: "offline",
        error:
          "Oda sunucusuna ulaşılamadı. Sunucunun çalıştığından emin ol; tek oyunculu oyun kullanılabilir.",
      },
    }));
  });
  socket.on(
    "joined",
    (data: { code: string; token: string; id: string; save: Save }) => {
      connectedCode = data.code;
      localStorage.setItem("sondoz.room-token", JSON.stringify(data.token));
      localStorage.setItem(
        "sondoz.room-tokens",
        JSON.stringify({ ...tokens(), [data.code]: data.token }),
      );
      useGame.setState((st) => ({
        save: data.save,
        playing: true,
        panel: "lobby",
        network: {
          ...st.network,
          status: "online",
          room: data.code,
          id: data.id,
          recoverToken: data.token,
          error: "",
        },
      }));
      bindNetworkCommand((action, data) =>
        socket!.emit("command", { action, data }),
      );
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        const s = useGame.getState();
        socket?.emit("move", {
          pos: s.save.pos,
          rotation: s.facing,
          insidePos: s.indoorPos,
        });
      }, 100);
      s.notify(`Odaya bağlandın · ${data.code}`, "success");
    },
  );
  socket.on(
    "snapshot",
    (data: {
      save: Save;
      peers: Peer[];
      sharedCash: number;
      quest: string | null;
      stage: number;
      inside: boolean;
      house: SharedHouse;
      loans: Loan[];
    }) => {
      useGame.setState((st) => ({
        save: {
          ...data.save,
          pos:
            Math.hypot(
              data.save.pos[0] - st.save.pos[0],
              data.save.pos[1] - st.save.pos[1],
            ) > 15
              ? data.save.pos
              : st.save.pos,
        },
        interior: data.inside,
        network: {
          ...st.network,
          house: data.house,
          loans: data.loans,
          peers: data.peers,
          sharedCash: data.sharedCash,
          sharedQuest: data.quest,
          sharedStage: data.stage,
        },
      }));
    },
  );
  socket.on("home-transition", (inside: boolean) => {
    useGame.setState({
      interior: inside,
      indoorPos: [0, 3],
      panel: "none",
      decorating: null,
    });
  });
  socket.on("notice", (data: { text: string; type?: string }) =>
    s.notify(data.text, data.type),
  );
  socket.on("room-error", (error: string) =>
    useGame.setState((st) => ({
      network: {
        ...st.network,
        error,
        status: st.network.room ? "online" : "offline",
      },
    })),
  );
  socket.on("disconnect", (reason) => {
    bindNetworkCommand(null);
    if (interval) clearInterval(interval);
    useGame.setState((st) => ({
      network: {
        ...st.network,
        status: "offline",
        peers: [],
        error:
          reason === "io client disconnect"
            ? ""
            : "Bağlantı kesildi. Aynı kodla tekrar katıldığında sunucu kaydın yüklenir.",
      },
    }));
    if (reason !== "io client disconnect") useGame.getState().setPanel("lobby");
  });
}
export function leaveRoom() {
  socket?.disconnect();
  socket = null;
  bindNetworkCommand(null);
  if (interval) clearInterval(interval);
  let local: Save | null = null;
  try {
    local = validateSave(
      JSON.parse(localStorage.getItem("sondoz.save.v1") || "null"),
    );
  } catch {}
  useGame.setState((st) => ({
    save: local || initialSave(st.save.character),
    playing: !!local,
    panel: "menu",
    interior: false,
    network: {
      ...st.network,
      status: "offline",
      room: "",
      peers: [],
      id: "",
      sharedQuest: null,
      house: null,
      loans: [],
    },
  }));
  useGame
    .getState()
    .notify("Odadan ayrıldın. Oda ilerlemen sunucuda saklandı.");
}
export function roomCommand(action: string, data: unknown = {}) {
  socket?.emit("command", { action, data });
}
