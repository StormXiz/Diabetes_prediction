"use client";

import { useEffect, useRef, useState } from "react";
import { FoodIcon } from "@/components/FoodIcon";
import { greeting, suggestionsFor, answer, type ChatMsg, type ChatContext } from "@/lib/chatbot";
import { displayFoodName } from "@/lib/foodDisplay";
import { loadStoredChat, saveStoredChat } from "@/lib/chatMemory";
import type { FoodItem } from "@/lib/data/curatedFoods";

async function askAI(
  ctx: ChatContext,
  history: ChatMsg[],
  message: string,
): Promise<{ msg: ChatMsg; restrictionsUpdated?: string[] }> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ctx,
        history: history.map((m) => ({ role: m.role, text: m.text })),
        message,
      }),
    });
    if (!res.ok) throw new Error("bad status");
    const data = (await res.json()) as { reply: string; foods?: FoodItem[]; restrictionsUpdated?: string[] };
    return { msg: { role: "bot", text: data.reply, foods: data.foods }, restrictionsUpdated: data.restrictionsUpdated };
  } catch {
    // Si la red o el endpoint fallan, caemos a la respuesta por reglas local.
    return { msg: answer("free", ctx, message) };
  }
}

export function GuideChatbot({
  ctx,
  onRestrictionsChange,
  compact,
}: {
  ctx: ChatContext;
  onRestrictionsChange?: (restrictions: string[]) => void;
  compact?: boolean;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestions = suggestionsFor(ctx);

  // Depende SOLO de level/percent (el perfil de riesgo), nunca del objeto
  // `ctx` completo: cuando el chat actualiza `restrictions` a mitad de
  // conversación (function calling), el padre reconstruye `ctx` con una
  // referencia nueva — si este efecto dependiera de `ctx` entero, cada
  // respuesta del bot borraba todo el historial y lo dejaba solo con el
  // saludo otra vez ("el chat se reinicia" al escribir algo).
  //
  // Memoria por persona (localStorage, sin cuentas): si ya hay una
  // conversación guardada para este MISMO nivel/porcentaje de riesgo, se
  // restaura tal cual — el usuario retoma donde dejó. Si el riesgo cambió
  // (nueva predicción), se arranca un saludo fresco porque ya es otra
  // conversación.
  useEffect(() => {
    const stored = loadStoredChat(ctx.level, ctx.percent);
    setMsgs(stored ?? [greeting(ctx)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.level, ctx.percent]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  useEffect(() => {
    if (msgs.length > 0) saveStoredChat(ctx.level, ctx.percent, msgs);
  }, [ctx.level, ctx.percent, msgs]);

  function push(msg: ChatMsg) {
    setMsgs((m) => [...m, msg]);
  }

  async function sendToAI(userText: string) {
    const history = [...msgs];
    push({ role: "user", text: userText });
    setTyping(true);
    const { msg, restrictionsUpdated } = await askAI(ctx, history, userText);
    setTyping(false);
    push(msg);
    if (restrictionsUpdated) onRestrictionsChange?.(restrictionsUpdated);
  }

  function handleSuggestion(label: string) {
    if (typing) return;
    void sendToAI(label);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || typing) return;
    setInput("");
    void sendToAI(text);
  }

  return (
    <section
      className={`overflow-hidden rounded-3xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60 ${compact ? "" : "mt-10"}`}
    >
      <header className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-blue-600 px-5 py-4 dark:border-slate-800">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Guía nutricional</p>
          <p className="text-xs text-white/80">Personalizado según tu resultado</p>
        </div>
      </header>

      <div ref={scrollRef} className="max-h-[420px] space-y-4 overflow-y-auto px-5 py-5">
        {msgs.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
        {typing && <TypingDots />}
      </div>

      <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        {/* Solo antes del primer mensaje del usuario — msgs.length===1 es
            solo el saludo inicial. Una vez que escribe algo, estas sugerencias
            ya no aplican y solo estorban. */}
        {msgs.length <= 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.intent}
                onClick={() => handleSuggestion(s.label)}
                disabled={typing}
                className="cursor-pointer rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors duration-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribe tu pregunta…"
            className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            onClick={handleSend}
            disabled={typing}
            aria-label="Enviar"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white transition-transform duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

function Bubble({ msg }: { msg: ChatMsg }) {
  const isBot = msg.role === "bot";
  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isBot
            ? "rounded-tl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
            : "rounded-tr-sm bg-gradient-to-r from-emerald-600 to-blue-600 text-white"
        }`}
      >
        <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
        {msg.foods && msg.foods.length > 0 && (
          <div className="mt-3 grid gap-2">
            {msg.foods.map((f) => (
              <FoodChip key={f.nombre} food={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FoodChip({ food }: { food: FoodItem }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
      <FoodIcon name={food.nombre} tone={food.avoid ? "bad" : "good"} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{displayFoodName(food.nombre)}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {food.kcal ?? "—"} kcal · {food.fibra ?? 0} g fibra · {food.prot ?? 0} g prot
        </p>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 dark:bg-slate-800">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
