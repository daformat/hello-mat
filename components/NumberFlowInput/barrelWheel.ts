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

export const getBarrelWheel = (
  container: HTMLElement,
  index: number,
  barrelWheelClass: string
): HTMLElement | null => {
  const selector = `[data-char-index="${index}"]${barrelWheelClass ? `.${barrelWheelClass}` : ""}`
  return container.querySelector(selector) as HTMLElement | null
}

export const getAllBarrelWheels = (
  container: HTMLElement,
  barrelWheelClass: string
): HTMLElement[] => {
  const selector = `[data-char-index]${barrelWheelClass ? `.${barrelWheelClass}` : ""}`
  return Array.from(container.querySelectorAll(selector)) as HTMLElement[]
}

export const setWidthConstraints = (
  span: HTMLElement,
  width: number
): void => {
  span.style.display = "inline-block"
  span.style.width = `${width}px`
  span.style.minWidth = `${width}px`
  span.style.maxWidth = `${width}px`
}

export const clearBarrelWheelsAndSpans = (
  spanElement: HTMLElement,
  parentContainer: HTMLElement | null,
  barrelWheelClass: string
): void => {
  while (spanElement.firstChild) {
    spanElement.removeChild(spanElement.firstChild)
  }
  if (parentContainer) {
    const selector = `[data-char-index]${barrelWheelClass ? `.${barrelWheelClass}` : ""}`
    parentContainer.querySelectorAll(selector).forEach((wheel) => wheel.remove())
  }
}
