"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormSection, YesNoField } from "@/components/forms";
import { FoodEditor } from "./FoodEditor";
import { RISK_META } from "@/lib/risk";

type Diet = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  target_risk: string;
  is_published: boolean;
  image_url: string | null;
};

type Food = {
  id: string;
  name: string;
  category: string;
  portion: string | null;
  notes: string | null;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function DietEditor({
  mode,
  diet,
  foods,
}: {
  mode: "create" | "edit";
  diet: Diet | null;
  foods: Food[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(diet?.title ?? "");
  const [slug, setSlug] = useState(diet?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(diet?.description ?? "");
  const [targetRisk, setTargetRisk] = useState(diet?.target_risk ?? "low");
  const [isPublished, setIsPublished] = useState(diet?.is_published ?? false);
  const [imageUrl, setImageUrl] = useState(diet?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("diet-images").upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("diet-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      title,
      slug,
      description: description || null,
      target_risk: targetRisk,
      is_published: isPublished,
      image_url: imageUrl || null,
    };

    if (mode === "create") {
      const { data, error: insertError } = await supabase.from("diets").insert(payload).select("id").single();
      setSaving(false);
      if (insertError) {
        setError(insertError.message);
        return;
      }
      router.push(`/admin/diets/${data.id}`);
      router.refresh();
      return;
    }

    const { error: updateError } = await supabase.from("diets").update(payload).eq("id", diet!.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSavedAt(Date.now());
    router.refresh();
  }

  return (
    <div className="space-y-10">
      <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <FormSection title="Contenido">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Título</span>
            <input
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Slug</span>
            <input
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="mt-1 block text-xs text-slate-400">Visible en /diets/{slug || "..."}</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Descripción</span>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
        </FormSection>

        <FormSection title="Segmentación">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RISK_META) as (keyof typeof RISK_META)[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTargetRisk(key)}
                className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
                style={
                  targetRisk === key
                    ? { color: RISK_META[key].color, backgroundColor: RISK_META[key].bg, boxShadow: `inset 0 0 0 1.5px ${RISK_META[key].color}` }
                    : { color: "#64748b", backgroundColor: "#f1f5f9" }
                }
              >
                {RISK_META[key].label}
              </button>
            ))}
          </div>
          <YesNoField
            label="Publicada"
            help="Solo las dietas publicadas aparecen en /diets y como recomendación"
            value={isPublished ? 1 : 0}
            onChange={(v) => setIsPublished(v === 1)}
          />
        </FormSection>

        <FormSection title="Imagen">
          <div className="flex items-center gap-4">
            <div
              className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 bg-cover bg-center"
              style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
              aria-hidden
            />
            <label className="cursor-pointer rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200">
              {uploading ? "Subiendo..." : imageUrl ? "Cambiar imagen" : "Subir imagen"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </label>
          </div>
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving ? "Guardando..." : mode === "create" ? "Crear dieta" : "Guardar cambios"}
          </button>
          {savedAt && <span className="text-sm text-emerald-600">Guardado ✓</span>}
        </div>
      </form>

      {mode === "edit" && diet ? (
        <FoodEditor dietId={diet.id} foods={foods} />
      ) : (
        <p className="text-sm text-slate-400">Guarda la dieta para poder añadir alimentos.</p>
      )}
    </div>
  );
}
