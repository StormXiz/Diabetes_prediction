import { NextResponse } from "next/server";
import {
  SYSTEM_PROMPT,
  buildGrounding,
  foodsForMessage,
  substitutesFor,
  answer,
  type ChatContext,
} from "@/lib/chatbot";
import { RESTRICTABLE_CATEGORIES } from "@/lib/dietEngine";

type Body = {
  ctx: ChatContext;
  history: { role: "bot" | "user"; text: string }[];
  message: string;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";
const REQUEST_TIMEOUT_MS = 30000;

// gpt-5-mini (y otros modelos "reasoning") consumen tokens de razonamiento
// interno ANTES de producir la respuesta visible — con max_completion_tokens
// bajo, todo el presupuesto se lo come el razonamiento y "content" llega
// vacío (finish_reason: "length"). reasoning_effort: "low" limita ese gasto
// interno (conviene para un chat que debe responder en pocas frases) y el
// tope de tokens se sube con margen de sobra para no repetir el problema.
const REASONING_EFFORT = "low";
const MAX_TOKENS_FIRST = 1200;
const MAX_TOKENS_SECOND = 600;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "update_dietary_restrictions",
      description:
        "Actualiza las categorías de alimentos que el usuario no puede o no quiere comer (intolerancias, alergias, preferencias como vegetarianismo). Reemplaza la lista COMPLETA de restricciones activas de este usuario — inclúyela vacía [] si el usuario dice que ya no tiene ninguna restricción, o sin una categoría si dice que esa ya no aplica.",
      parameters: {
        type: "object",
        properties: {
          restrictions: {
            type: "array",
            items: { type: "string", enum: RESTRICTABLE_CATEGORIES },
            description: "Lista completa y actualizada de categorías a excluir del plan de comidas de ESTE usuario (puede ser vacía).",
          },
        },
        required: ["restrictions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_food_alternatives",
      description:
        "Busca sustitutos reales para un alimento específico que el usuario quiere cambiar en su plan (ej. 'cámbiame la tilapia', 'no quiero pollo'). Devuelve otros alimentos de la MISMA categoría (ej. otro pescado/carne para reemplazar pescado), tomados de platos reales ya usados en la app — nunca inventes ni sugieras un sustituto de otra categoría (como fruta para reemplazar una proteína) sin usar esta función.",
      parameters: {
        type: "object",
        properties: {
          food_name: {
            type: "string",
            description: "Nombre del alimento que el usuario quiere sustituir, tal como aparece en su plan (ej. 'Tilapia', 'Pollo', 'Lenteja').",
          },
        },
        required: ["food_name"],
      },
    },
  },
];

async function callOpenAI(key: string, payload: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { ctx, history, message } = body;
  const foods = foodsForMessage(ctx, message);

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ reply: answer("free", ctx, message).text, foods, source: "rules" });
  }

  const messages: { role: string; content: string }[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nContexto del usuario:\n${buildGrounding(ctx)}` },
    ...history.slice(-8).map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text,
    })),
    { role: "user", content: message },
  ];

  try {
    const first = await callOpenAI(key, {
      model: MODEL,
      messages,
      tools: TOOLS,
      max_completion_tokens: MAX_TOKENS_FIRST,
      reasoning_effort: REASONING_EFFORT,
    });

    if (!first.ok) {
      const detail = await first.text();
      console.error("OpenAI error", first.status, detail.slice(0, 300));
      return NextResponse.json({ reply: answer("free", ctx, message).text, foods, source: "rules" });
    }

    const firstData = await first.json();
    const assistantMsg = firstData.choices?.[0]?.message;
    const finishReason = firstData.choices?.[0]?.finish_reason;
    const toolCalls = assistantMsg?.tool_calls as
      | { id: string; function: { name: string; arguments: string } }[]
      | undefined;

    if (toolCalls?.length) {
      let restrictionsUpdated: string[] | undefined;
      let substituteFoods: typeof foods | undefined;
      const toolResults: { role: string; tool_call_id: string; content: string }[] = [];

      for (const call of toolCalls) {
        if (call.function.name === "update_dietary_restrictions") {
          let restrictions: string[] = [];
          try {
            restrictions = JSON.parse(call.function.arguments)?.restrictions ?? [];
          } catch {
            restrictions = [];
          }
          restrictions = restrictions.filter((r) => RESTRICTABLE_CATEGORIES.includes(r));

          // Sin login: no hay dónde persistir en el servidor. Se devuelve
          // `restrictionsUpdated` y el cliente (GuideChatbot -> callers) lo
          // guarda en localStorage de este navegador.
          restrictionsUpdated = restrictions;
          toolResults.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ ok: true, restrictions }),
          });
          continue;
        }

        if (call.function.name === "suggest_food_alternatives") {
          let foodName = "";
          try {
            foodName = JSON.parse(call.function.arguments)?.food_name ?? "";
          } catch {
            foodName = "";
          }
          const alternatives = foodName
            ? substitutesFor(ctx.level, foodName, ctx.restrictions ?? [], 4)
            : [];
          substituteFoods = alternatives;
          toolResults.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({
              ok: alternatives.length > 0,
              alternatives: alternatives.map((f) => f.nombre),
            }),
          });
        }
      }

      const second = await callOpenAI(key, {
        model: MODEL,
        messages: [...messages, assistantMsg, ...toolResults],
        max_completion_tokens: MAX_TOKENS_SECOND,
        reasoning_effort: REASONING_EFFORT,
      });

      const responseFoods = substituteFoods ?? foods;

      if (!second.ok) {
        const detail = await second.text();
        console.error("OpenAI error (segunda llamada, tras tool call)", second.status, detail.slice(0, 300));
        return NextResponse.json({
          reply: "Listo, hice el cambio.",
          foods: responseFoods,
          source: "ai",
          restrictionsUpdated,
        });
      }

      const secondData = await second.json();
      const finalReply: string | undefined = secondData.choices?.[0]?.message?.content?.trim();
      if (!finalReply) {
        console.error(
          "OpenAI devolvió contenido vacío tras tool call. finish_reason:",
          secondData.choices?.[0]?.finish_reason,
          "usage:",
          secondData.usage,
        );
      }

      return NextResponse.json({
        reply: finalReply || "Listo, hice el cambio.",
        foods: responseFoods,
        source: "ai",
        restrictionsUpdated,
      });
    }

    const reply: string | undefined = assistantMsg?.content?.trim();
    if (!reply) {
      // Esto no debería pasar con el margen de tokens actual — si vuelve a
      // pasar, este log dice exactamente por qué (en vez de fallar en
      // silencio hacia el fallback de reglas, como pasaba antes).
      console.error(
        "OpenAI devolvió contenido vacío. finish_reason:",
        finishReason,
        "usage:",
        firstData.usage,
      );
      return NextResponse.json({ reply: answer("free", ctx, message).text, foods, source: "rules" });
    }

    return NextResponse.json({ reply, foods, source: "ai" });
  } catch (err) {
    console.error("OpenAI request failed", err);
    return NextResponse.json({ reply: answer("free", ctx, message).text, foods, source: "rules" });
  }
}
