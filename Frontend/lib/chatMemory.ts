// Memoria del chat en localStorage — "por persona" en el sentido de que no
// hay cuentas: es por navegador/dispositivo, igual que el resto del perfil
// local. Se guarda junto con el nivel/porcentaje de riesgo con el que se
// generó, así que si el usuario predice de nuevo y su riesgo cambia, el chat
// arranca fresco (tiene sentido, es una conversación sobre ESE resultado)
// en vez de seguir una charla que ya no aplica a su situación actual.
import type { ChatMsg } from "@/lib/chatbot";

type StoredChat = {
  level: string;
  percent: number;
  msgs: ChatMsg[];
};

const KEY = "guide_chat_history";
const MAX_STORED_MSGS = 40;

export function loadStoredChat(level: string, percent: number): ChatMsg[] | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredChat;
    if (stored.level !== level || stored.percent !== percent) return null;
    return stored.msgs.length > 0 ? stored.msgs : null;
  } catch {
    return null;
  }
}

export function saveStoredChat(level: string, percent: number, msgs: ChatMsg[]) {
  if (typeof window === "undefined") return;
  const trimmed = msgs.slice(-MAX_STORED_MSGS);
  localStorage.setItem(KEY, JSON.stringify({ level, percent, msgs: trimmed } satisfies StoredChat));
}
