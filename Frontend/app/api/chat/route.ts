import { NextResponse } from "next/server";
import {
  SYSTEM_PROMPT,
  buildGrounding,
  foodsForMessage,
  answer,
  type ChatContext,
} from "@/lib/chatbot";
import { RESTRICTABLE_CATEGORIES } from "@/lib/dietEngine";
import { createClient } from "@/lib/supabase/server";

type Body = {
  ctx: ChatContext;
  history: { role: "bot" | "user"; text: string }[];
  message: string;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "update_dietary_restrictions",
      description:
        "Actualiza las categorías de alimentos que el usuario no puede o no quiere comer (intolerancias, alergias, preferencias como vegetarianismo). Reemplaza la lista completa de restricciones activas — incluye las que ya estaban más las nuevas.",
      parameters: {
        type: "object",
        properties: {
          restrictions: {
            type: "array",
            items: { type: "string", enum: RESTRICTABLE_CATEGORIES },
            description: "Lista completa de categorías a excluir del plan de comidas.",
          },
        },
        required: ["restrictions"],
      },
    },
  },
];

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const first = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, max_completion_tokens: 500 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!first.ok) {
      const detail = await first.text();
      console.error("OpenAI error", first.status, detail.slice(0, 300));
      return NextResponse.json({ reply: answer("free", ctx, message).text, foods, source: "rules" });
    }

    const firstData = await first.json();
    const assistantMsg = firstData.choices?.[0]?.message;
    const toolCalls = assistantMsg?.tool_calls as
      | { id: string; function: { name: string; arguments: string } }[]
      | undefined;

    if (toolCalls?.length) {
      let restrictionsUpdated: string[] | undefined;
      const toolResults: { role: string; tool_call_id: string; content: string }[] = [];

      for (const call of toolCalls) {
        if (call.function.name !== "update_dietary_restrictions") continue;

        let restrictions: string[] = [];
        try {
          restrictions = JSON.parse(call.function.arguments)?.restrictions ?? [];
        } catch {
          restrictions = [];
        }
        restrictions = restrictions.filter((r) => RESTRICTABLE_CATEGORIES.includes(r));

        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("weight_kg, height_cm, age, sex, activity_level")
            .eq("id", user.id)
            .single();

          await supabase.rpc("update_my_biometrics", {
            p_weight_kg: profile?.weight_kg ?? null,
            p_height_cm: profile?.height_cm ?? null,
            p_age: profile?.age ?? null,
            p_sex: profile?.sex ?? null,
            p_activity_level: profile?.activity_level ?? null,
            p_dietary_restrictions: restrictions,
          });
        }

        restrictionsUpdated = restrictions;
        toolResults.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ ok: true, restrictions, persisted: !!user }),
        });
      }

      const second = await fetch(OPENAI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [...messages, assistantMsg, ...toolResults],
          max_completion_tokens: 400,
        }),
      });

      const secondData = await second.json();
      const finalReply: string =
        secondData.choices?.[0]?.message?.content?.trim() ?? "Listo, actualicé tus restricciones.";

      return NextResponse.json({ reply: finalReply, foods, source: "ai", restrictionsUpdated });
    }

    const reply: string | undefined = assistantMsg?.content?.trim();
    if (!reply) {
      return NextResponse.json({ reply: answer("free", ctx, message).text, foods, source: "rules" });
    }

    return NextResponse.json({ reply, foods, source: "ai" });
  } catch (err) {
    console.error("OpenAI request failed", err);
    return NextResponse.json({ reply: answer("free", ctx, message).text, foods, source: "rules" });
  }
}
