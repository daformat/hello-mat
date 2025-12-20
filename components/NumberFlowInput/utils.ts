export const measureText = (text: string, referenceElement: HTMLElement) => {
  const computedStyle = window.getComputedStyle(referenceElement)
  const tempMeasure = document.createElement("span")
  tempMeasure.style.position = "absolute"
  tempMeasure.style.visibility = "hidden"
  tempMeasure.style.whiteSpace = "pre"
  tempMeasure.style.font = computedStyle.font
  tempMeasure.style.fontSize = computedStyle.fontSize
  tempMeasure.style.fontFamily = computedStyle.fontFamily
  tempMeasure.style.fontWeight = computedStyle.fontWeight
  tempMeasure.style.fontStyle = computedStyle.fontStyle
  tempMeasure.style.letterSpacing = computedStyle.letterSpacing
  tempMeasure.style.textTransform = computedStyle.textTransform
  tempMeasure.style.lineHeight = computedStyle.lineHeight
  tempMeasure.textContent = text
  document.body.appendChild(tempMeasure)
  const width = tempMeasure.getBoundingClientRect().width
  document.body.removeChild(tempMeasure)
  return width
}

export const getSelectionRange = (
  element: HTMLElement,
  selection: Selection
): { start: number; end: number } => {
  const range = selection.getRangeAt(0)
  const preRange = document.createRange()
  preRange.selectNodeContents(element)
  preRange.setEnd(range.startContainer, range.startOffset)
  const start = preRange.toString().length
  preRange.setEnd(range.endContainer, range.endOffset)
  const end = preRange.toString().length
  return { start, end }
}

export const setCursorPositionInElement = (
  element: HTMLElement,
  position: number
): void => {
  const selection = window.getSelection()
  if (!selection) return

  const targetPos = Math.min(position, element.textContent?.length ?? 0)
  const targetSpan = element.querySelector(
    `[data-char-index="${targetPos}"]`
  )

  if (targetSpan) {
    const textNode = targetSpan.firstChild
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }
  }

  if (targetPos === element.textContent?.length && element.textContent.length > 0) {
    const lastSpan = element.querySelector(
      `[data-char-index="${element.textContent.length - 1}"]`
    )
    if (lastSpan) {
      const textNode = lastSpan.firstChild
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange()
        range.setStart(textNode, textNode.textContent?.length ?? 0)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        return
      }
    }
  }

  let currentPos = 0
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  )
  let node: Node | null

  while ((node = walker.nextNode())) {
    const nodeLength = node.textContent?.length ?? 0
    if (currentPos + nodeLength >= targetPos) {
      const offset = Math.min(targetPos - currentPos, nodeLength)
      const range = document.createRange()
      range.setStart(node, offset)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }
    currentPos += nodeLength
  }

  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

export const isTransparent = (element: HTMLElement): boolean => {
  return (
    element.style.color === "transparent" ||
    element.style.color === "rgba(0, 0, 0, 0)" ||
    window.getComputedStyle(element).color === "rgba(0, 0, 0, 0)"
  )
}

export const removeTransparentColor = (span: HTMLElement): void => {
  if (
    span.style.color === "transparent" ||
    span.style.color === "rgba(0, 0, 0, 0)" ||
    span.style.color === ""
  ) {
    span.style.color = ""
  }
  const computedColor = window.getComputedStyle(span).color
  if (
    computedColor === "rgba(0, 0, 0, 0)" ||
    computedColor === "transparent"
  ) {
    span.style.color = ""
  }
}

export const findNodeAtPosition = (
  element: HTMLElement,
  targetPos: number
): { node: Node; offset: number } | null => {
  let currentPos = 0
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)
  let node: Node | null

  while ((node = walker.nextNode())) {
    const nodeLength = node.textContent?.length ?? 0
    if (currentPos + nodeLength >= targetPos) {
      return { node, offset: Math.min(targetPos - currentPos, nodeLength) }
    }
    currentPos += nodeLength
  }
  return null
}

export const setCursorAtPosition = (
  element: HTMLElement,
  position: number,
  selection?: Selection | null
): void => {
  const sel = selection ?? window.getSelection()
  if (!sel) return

  const found = findNodeAtPosition(element, position)
  if (found) {
    const range = document.createRange()
    range.setStart(found.node, found.offset)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    return
  }

  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
}

export const getPositionFromNode = (
  container: HTMLElement,
  node: Node | null,
  offset: number
): number => {
  if (!node || !container.contains(node)) return 0
  const range = document.createRange()
  range.setStart(container, 0)
  range.setEnd(node, offset)
  return range.toString().length
}

export const getBarrelWheelSelector = (
  index: number | null,
  barrelWheelClass: string
): string => {
  const classSelector = barrelWheelClass ? `.${barrelWheelClass}` : ""
  if (index === null) {
    return `[data-char-index]${classSelector}`
  }
  return `[data-char-index="${index}"]${classSelector}`
}

