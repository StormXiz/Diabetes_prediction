"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PublishToggle } from "./PublishToggle";
import { ConfirmActionButton } from "./ConfirmActionButton";
import { RISK_META, isRiskCategory } from "@/lib/risk";

type Diet = {
  id: string;
  title: string;
  slug: string;
  target_risk: string;
  is_published: boolean;
  image_url: string | null;
};

export function DietRow({ diet }: { diet: Diet }) {
  const router = useRouter();
  const [togglePending, setTogglePending] = useState(false);
  const meta = isRiskCategory(diet.target_risk) ? RISK_META[diet.target_risk] : null;

  async function handleTogglePublish(next: boolean) {
    setTogglePending(true);
    const supabase = createClient();
    await supabase.from("diets").update({ is_published: next }).eq("id", diet.id);
    setTogglePending(false);
    router.refresh();
  }

  async function handleDelete() {
    const supabase = createClient();
    await supabase.from("diets").delete().eq("id", diet.id);
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div
          className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 bg-cover bg-center"
          style={diet.image_url ? { backgroundImage: `url(${diet.image_url})` } : undefined}
          aria-hidden
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/diets/${diet.id}`} className="font-semibold text-slate-900 hover:text-emerald-700">
              {diet.title}
            </Link>
            {meta && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ color: meta.color, backgroundColor: meta.bg }}
              >
                {meta.label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">/{diet.slug}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{diet.is_published ? "Publicada" : "Borrador"}</span>
          <PublishToggle checked={diet.is_published} onChange={handleTogglePublish} disabled={togglePending} />
        </div>
        <Link
          href={`/admin/diets/${diet.id}`}
          className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
        >
          Editar
        </Link>
        <ConfirmActionButton onConfirm={handleDelete} />
      </div>
    </li>
  );
}
