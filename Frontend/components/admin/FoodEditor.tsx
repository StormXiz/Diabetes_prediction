"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmActionButton } from "./ConfirmActionButton";
import { EmptyState } from "./EmptyState";

type Food = {
  id: string;
  name: string;
  category: string;
  portion: string | null;
  notes: string | null;
};

const EMPTY_FORM = { name: "", category: "recommended" as "recommended" | "avoid", portion: "", notes: "" };

export function FoodEditor({ dietId, foods }: { dietId: string; foods: Food[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommended = foods.filter((f) => f.category === "recommended");
  const avoid = foods.filter((f) => f.category === "avoid");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("foods").insert({
      diet_id: dietId,
      name: form.name.trim(),
      category: form.category,
      portion: form.portion.trim() || null,
      notes: form.notes.trim() || null,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm(EMPTY_FORM);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("foods").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Alimentos</h2>

      {foods.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Esta dieta todavía no tiene alimentos"
            description="Añade al menos uno recomendado y uno a evitar para que /diets/[slug] no se vea incompleto."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <FoodList title="Recomendados" tone="emerald" items={recommended} onDelete={handleDelete} />
          <FoodList title="Evitar / moderar" tone="red" items={avoid} onDelete={handleDelete} />
        </div>
      )}

      <form onSubmit={handleAdd} className="mt-6 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Nombre</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Categoría</span>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as "recommended" | "avoid" }))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="recommended">Recomendado</option>
            <option value="avoid">Evitar / moderar</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Porción (opcional)</span>
          <input
            value={form.portion}
            onChange={(e) => setForm((f) => ({ ...f, portion: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Notas (opcional)</span>
          <input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="justify-self-start rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 sm:col-span-2"
        >
          {saving ? "Añadiendo..." : "Añadir alimento"}
        </button>
      </form>
    </div>
  );
}

function FoodList({
  title,
  tone,
  items,
  onDelete,
}: {
  title: string;
  tone: "emerald" | "red";
  items: Food[];
  onDelete: (id: string) => void;
}) {
  const dot = tone === "emerald" ? "bg-emerald-500" : "bg-red-500";
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((f) => (
          <li key={f.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
              <div>
                <p className="text-sm font-medium text-slate-800">{f.name}</p>
                {f.portion && <p className="text-xs text-slate-400">Porción: {f.portion}</p>}
                {f.notes && <p className="text-xs text-slate-500">{f.notes}</p>}
              </div>
            </div>
            <ConfirmActionButton onConfirm={() => onDelete(f.id)} label="Borrar" confirmLabel="¿Seguro?" />
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400">Sin alimentos en esta categoría.</p>}
      </ul>
    </div>
  );
}
