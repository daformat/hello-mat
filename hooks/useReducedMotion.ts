import { useEffect, useState } from "react"

export const useReducedMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mediaMatcher = window.matchMedia("(prefers-reduced-motion: reduce")
    const handler = (event: MediaQueryListEvent) => {
      setReduceMotion(event.matches)
    }
    mediaMatcher.addEventListener("change", handler)
    setReduceMotion(mediaMatcher.matches)

    return () => {
      mediaMatcher.removeEventListener("change", handler)
    }
  }, [setReduceMotion])
  return reduceMotion
}
