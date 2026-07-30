"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { GuideChatbot } from "@/components/GuideChatbot";
import { riskToLevel } from "@/lib/data/diet_guidance";
import type { ChatContext } from "@/lib/chatbot";

const DEFAULT_CTX: ChatContext = { level: "low", percent: 0, topFactors: [], restrictions: [] };

export function FloatingChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ctx, setCtx] = useState<ChatContext>(DEFAULT_CTX);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoaded(true);
        return;
      }
      const [{ data: pred }, { data: profile }] = await Promise.all([
        supabase
          .from("predictions")
          .select("risk_score, risk_category, top_factors")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("profiles").select("dietary_restrictions").eq("id", user.id).single(),
      ]);
      if (cancelled) return;
      setCtx({
        level: pred ? riskToLevel(pred.risk_category) : "low",
        percent: pred ? Math.round(pred.risk_score * 100) : 0,
        topFactors: (pred?.top_factors as { feature: string; direction: string }[] | null) ?? [],
        restrictions: profile?.dietary_restrictions ?? [],
      });
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar asistente nutricional" : "Abrir asistente nutricional"}
        whileHover={shouldReduceMotion ? undefined : { scale: 1.06 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-xl"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
          </svg>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm"
          >
            <GuideChatbot
              compact
              ctx={ctx}
              onRestrictionsChange={(r) => setCtx((c) => ({ ...c, restrictions: r }))}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
