// Perfil biométrico + restricciones alimentarias, guardados en localStorage
// del navegador — sin login no hay cuenta ni tabla `profiles` donde
// persistirlos, así que viven en ESTE navegador/dispositivo. Se piden una
// sola vez (como antes), solo que "una vez por navegador" en vez de "una vez
// por cuenta".
import type { ActivityLevel, Sex } from "@/lib/tdee";

export type Biometrics = {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
};

type LocalProfile = {
  biometrics: Biometrics;
  restrictions: string[];
};

const KEY = "local_profile";

export function readLocalProfile(): LocalProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalProfile;
  } catch {
    return null;
  }
}

export function saveLocalProfile(biometrics: Biometrics, restrictions: string[]) {
  localStorage.setItem(KEY, JSON.stringify({ biometrics, restrictions }));
}

export function saveLocalRestrictions(restrictions: string[]) {
  const current = readLocalProfile();
  if (!current) return;
  saveLocalProfile(current.biometrics, restrictions);
}
