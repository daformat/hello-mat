export interface BarrelWheelData {
  sequence: string[]
  direction: "up" | "down"
}

export const cleanupWidthAnimation = (charSpan: HTMLElement): void => {
  charSpan.removeAttribute("data-width-animate")
  charSpan.style.width = ""
  charSpan.style.minWidth = ""
  charSpan.style.maxWidth = ""
  const inlineDisplay = charSpan.style.display
  if (inlineDisplay === "inline-block") {
    charSpan.style.display = ""
  }
  const transition = charSpan.style.transition
  if (
    transition &&
    (transition.includes("width") ||
      transition.includes("min-width") ||
      transition.includes("max-width"))
  ) {
    charSpan.style.transition = ""
  }
}

export const repositionBarrelWheel = (
  wheel: HTMLElement,
  charSpan: HTMLElement,
  parentContainer: HTMLElement
): void => {
  const rect = charSpan.getBoundingClientRect()
  const parentRect = parentContainer.getBoundingClientRect()
  wheel.style.left = `${rect.left - parentRect.left}px`
  wheel.style.top = `${rect.top - parentRect.top}px`
  wheel.style.width = `${rect.width}px`
  wheel.style.height = `${rect.height}px`
}
