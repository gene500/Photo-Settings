/** "f/8", "f/1.8". */
export function formatAperture(n: number): string {
  return `f/${Number.isInteger(n) ? n : n.toFixed(1)}`
}

/** "1/250 s" for fast speeds, "0.5 s" or "30 s" for slow ones. */
export function formatShutter(seconds: number): string {
  if (seconds < 0.3) return `1/${Math.round(1 / seconds)} s`
  return `${Number(seconds.toFixed(1))} s`
}
