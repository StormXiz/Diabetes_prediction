/**
 * Se muestra en vez del Canvas 3D cuando el navegador no soporta WebGL
 * (o mientras se confirma que sí). Nada de spinners genéricos: un anillo
 * concéntrico suave con la gota de la marca, sobre el mismo degradado
 * emerald→blue que ya usa el resto del sitio.
 */
export function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20">
      <div className="relative h-40 w-40">
        <div className="absolute inset-0 animate-pulse rounded-full border-2 border-emerald-500/20 [animation-duration:3s]" />
        <div className="absolute inset-5 animate-pulse rounded-full border-2 border-blue-500/20 [animation-delay:400ms] [animation-duration:3s]" />
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-14 w-14" fill="none">
          <path
            d="M12 2c-3 5-7 9.5-7 13.5A7 7 0 0 0 19 15.5C19 11.5 15 7 12 2Z"
            className="fill-emerald-600/70 dark:fill-emerald-400/70"
          />
        </svg>
      </div>
    </div>
  );
}
