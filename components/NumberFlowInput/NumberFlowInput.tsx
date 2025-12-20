import {
  ClipboardEventHandler,
  CompositionEventHandler,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { MaybeUndefined } from "@/components/Media/utils/maybe"
import styles from "./NumberFlowInput.module.scss"

export type NumberFlowInputControlledProps = {
  value: MaybeUndefined<number>
  defaultValue?: never
}

export type NumberFlowInputUncontrolledProps = {
  defaultValue?: number
  value?: never
}

export type NumberFlowInputCommonProps = {
  onChange?: (value: MaybeUndefined<number>) => void
  name?: string
  id?: string
  autoAddLeadingZero?: boolean // Whether to automatically add "0" before "." (default: false)
}

export type NumberFlowInputProps = NumberFlowInputCommonProps &
  (NumberFlowInputControlledProps | NumberFlowInputUncontrolledProps)

interface Changes {
  addedIndices: Set<number>
  unchangedIndices: Set<number>
  barrelWheelIndices: Map<
    number,
    { sequence: string[]; direction: "up" | "down" }
  >
}

const measureText = (text: string, referenceElement: HTMLElement) => {
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

const getChanges = (
  oldValue: string,
  newValue: string,
  selectionStart: number,
  selectionEnd: number,
  newCursorPos: number
): Changes => {
  const changes: Changes = {
    addedIndices: new Set(),
    unchangedIndices: new Set(),
    barrelWheelIndices: new Map(),
  }

  if (!oldValue) {
    for (let i = 0; i < newValue.length; i++) {
      changes.addedIndices.add(i)
    }
    return changes
  }

  const hadSelection = selectionStart !== selectionEnd
  const lengthDiff = newValue.length - oldValue.length

  if (hadSelection) {
    // Text was replaced - all new characters in the replacement range should animate
    const numReplaced = selectionEnd - selectionStart
    const numInserted = newCursorPos - selectionStart
    const insertStart = selectionStart

    // Check for single digit replacement (barrel wheel animation)
    if (
      numReplaced === 1 &&
      numInserted === 1 &&
      insertStart < oldValue.length &&
      insertStart < newValue.length
    ) {
      const oldChar = oldValue[insertStart]
      const newChar = newValue[insertStart]

      // Check if both are digits and not undefined
      if (oldChar && newChar && /^\d$/.test(oldChar) && /^\d$/.test(newChar)) {
        const oldDigit = parseInt(oldChar, 10)
        const newDigit = parseInt(newChar, 10)

        if (oldDigit !== newDigit) {
          // Generate sequence of digits for barrel wheel animation
          const sequence: string[] = []
          const direction = newDigit > oldDigit ? "up" : "down"

          if (direction === "up") {
            for (let i = oldDigit; i <= newDigit; i++) {
              sequence.push(i.toString())
            }
          } else {
            for (let i = newDigit; i <= oldDigit; i++) {
              sequence.push(i.toString())
            }
          }

          changes.barrelWheelIndices.set(insertStart, { sequence, direction })
        }
      }
    }

    // Mark unchanged before replacement
    for (let i = 0; i < insertStart; i++) {
      if (
        i < oldValue.length &&
        i < newValue.length &&
        oldValue[i] === newValue[i]
      ) {
        changes.unchangedIndices.add(i)
      }
    }

    // Mark all inserted characters as added (unless they're barrel wheel)
    for (let i = insertStart; i < newCursorPos; i++) {
      if (!changes.barrelWheelIndices.has(i)) {
        changes.addedIndices.add(i)
      }
    }

    // Mark unchanged after replacement
    // Need to account for the length difference
    const oldAfterEnd = selectionEnd
    const newAfterEnd = newCursorPos
    const minLength = Math.min(
      oldValue.length - oldAfterEnd,
      newValue.length - newAfterEnd
    )

    for (let i = 0; i < minLength; i++) {
      const oldIdx = oldAfterEnd + i
      const newIdx = newAfterEnd + i
      if (
        oldIdx < oldValue.length &&
        newIdx < newValue.length &&
        oldValue[oldIdx] === newValue[newIdx]
      ) {
        changes.unchangedIndices.add(newIdx)
      }
    }
  } else if (lengthDiff > 0) {
    // Addition without selection
    const insertPos = newCursorPos - lengthDiff

    // Mark unchanged before insertion
    for (let i = 0; i < insertPos; i++) {
      if (
        i < oldValue.length &&
        i < newValue.length &&
        oldValue[i] === newValue[i]
      ) {
        changes.unchangedIndices.add(i)
      }
    }

    // Mark added
    for (let i = insertPos; i < newCursorPos; i++) {
      changes.addedIndices.add(i)
    }

    // Mark unchanged after insertion
    for (let i = newCursorPos; i < newValue.length; i++) {
      const oldIdx = i - lengthDiff
      if (
        oldIdx >= 0 &&
        oldIdx < oldValue.length &&
        oldValue[oldIdx] === newValue[i]
      ) {
        changes.unchangedIndices.add(i)
      }
    }
  } else if (lengthDiff < 0) {
    // Deletion
    const deletePos = selectionStart
    const numDeleted = -lengthDiff

    // Mark unchanged before deletion
    for (let i = 0; i < deletePos; i++) {
      if (
        i < oldValue.length &&
        i < newValue.length &&
        oldValue[i] === newValue[i]
      ) {
        changes.unchangedIndices.add(i)
      }
    }

    // Mark unchanged after deletion
    // When deleting, characters after the deletion point shift left
    // So newValue[i] should match oldValue[i + numDeleted]
    for (let i = deletePos; i < newValue.length; i++) {
      const oldIdx = i + numDeleted
      if (oldIdx < oldValue.length && oldValue[oldIdx] === newValue[i]) {
        changes.unchangedIndices.add(i)
      }
    }
  } else {
    // No change, mark all as unchanged
    for (let i = 0; i < newValue.length; i++) {
      if (i < oldValue.length && oldValue[i] === newValue[i]) {
        changes.unchangedIndices.add(i)
      }
    }
  }

  return changes
}

export const NumberFlowInput = ({
  value,
  defaultValue,
  onChange,
  name,
  id,
  autoAddLeadingZero = false,
}: NumberFlowInputProps) => {
  const spanRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const isControlled = value !== undefined
  const actualValue = isControlled ? value : uncontrolledValue
  const [displayValue, setDisplayValue] = useState(
    actualValue?.toString() ?? ""
  )
  const [_cursorPosition, setCursorPosition] = useState(0)

  // Undo/Redo history
  const historyRef = useRef<
    Array<{ text: string; cursorPos: number; value: MaybeUndefined<number> }>
  >([])
  const historyIndexRef = useRef(-1)
  const isUndoRedoRef = useRef(false)

  // Track if we should prevent the next input event (for leading 0 bug)
  const shouldPreventInputRef = useRef(false)
  const preventInputCursorPosRef = useRef(0)

  // Track ResizeObservers for digits with barrel wheel animations
  const resizeObserversRef = useRef<Map<number, ResizeObserver>>(new Map())

  // Helper function to clean up width animation styles and attributes
  const cleanupWidthAnimation = useCallback((charSpan: HTMLElement) => {
    // Remove width animation attribute
    charSpan.removeAttribute("data-width-animate")
    // Remove inline width styles
    charSpan.style.width = ""
    charSpan.style.minWidth = ""
    charSpan.style.maxWidth = ""
    // Remove display style if it was explicitly set to inline-block (not from CSS)
    // Only clear if it was set as an inline style (not from CSS classes)
    const inlineDisplay = charSpan.style.display
    if (inlineDisplay === "inline-block") {
      charSpan.style.display = ""
    }
    // Remove inline transition if it was set (check if it contains width-related transitions)
    const transition = charSpan.style.transition
    if (
      transition &&
      (transition.includes("width") ||
        transition.includes("min-width") ||
        transition.includes("max-width"))
    ) {
      charSpan.style.transition = ""
    }
  }, [])

  // Helper function to reposition all existing barrel wheels
  const repositionAllBarrelWheels = useCallback(() => {
    if (!spanRef.current?.parentElement) return

    const parentContainer = spanRef.current.parentElement
    const existingBarrelWheels = parentContainer.querySelectorAll(
      `[data-char-index].${styles.barrel_wheel || ""}`
    )

    existingBarrelWheels.forEach((wheel) => {
      const wheelEl = wheel as HTMLElement
      const indexStr = wheelEl.getAttribute("data-char-index")
      if (indexStr !== null) {
        const index = parseInt(indexStr, 10)
        if (!isNaN(index) && index >= 0 && spanRef.current) {
          const charSpan = spanRef.current.querySelector(
            `[data-char-index="${index}"]`
          ) as HTMLElement | null

          if (charSpan) {
            // Ensure the digit remains transparent while barrel wheel is animating
            // This prevents the digit from showing through the barrel wheel
            if (
              charSpan.style.color !== "transparent" &&
              charSpan.style.color !== "rgba(0, 0, 0, 0)"
            ) {
              charSpan.style.color = "transparent"
            }

            const rect = charSpan.getBoundingClientRect()
            const parentRect = parentContainer.getBoundingClientRect()
            wheelEl.style.left = `${rect.left - parentRect.left}px`
            wheelEl.style.top = `${rect.top - parentRect.top}px`
            wheelEl.style.width = `${rect.width}px`
            wheelEl.style.height = `${rect.height}px`
          }
        }
      }
    })
  }, [styles.barrel_wheel])

  // Helper function to remove barrel wheels at specific indices
  const removeBarrelWheelsAtIndices = useCallback(
    (indices: number[]) => {
      if (!spanRef.current) return
      const parentContainer = spanRef.current.parentElement
      if (!parentContainer) return

      indices.forEach((index) => {
        // Clean up ResizeObserver for this index
        const observer = resizeObserversRef.current.get(index)
        if (observer) {
          observer.disconnect()
          resizeObserversRef.current.delete(index)
        }

        // Clean up width animation styles and attributes for the digit span
        const charSpan = spanRef.current?.querySelector(
          `[data-char-index="${index}"]`
        ) as HTMLElement | null
        if (charSpan) {
          if (charSpan.hasAttribute("data-width-animate")) {
            cleanupWidthAnimation(charSpan)
          }
          // Always remove color: transparent when barrel wheel is removed
          if (
            charSpan.style.color === "transparent" ||
            charSpan.style.color === "rgba(0, 0, 0, 0)" ||
            window.getComputedStyle(charSpan).color === "rgba(0, 0, 0, 0)"
          ) {
            charSpan.style.color = ""
          }
        }

        const barrelWheel = parentContainer.querySelector(
          `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
        ) as HTMLElement | null
        if (barrelWheel) {
          // Before removing, get the final digit to do a comprehensive cleanup
          const finalDigit = barrelWheel.getAttribute("data-final-digit")

          barrelWheel.remove()

          // After removing barrel wheel, do a final pass to ensure the span at THIS index is not still transparent
          // IMPORTANT: Only check the span at the specific index, not other spans with the same final digit
          // This prevents conflicts when multiple barrel wheels have the same final digit
          if (spanRef.current) {
            const spanAtIndex = spanRef.current.querySelector(
              `[data-char-index="${index}"]`
            ) as HTMLElement | null

            if (spanAtIndex) {
              const isTransparent =
                spanAtIndex.style.color === "transparent" ||
                spanAtIndex.style.color === "rgba(0, 0, 0, 0)" ||
                window.getComputedStyle(spanAtIndex).color ===
                  "rgba(0, 0, 0, 0)"

              // Check if there's still a barrel wheel for THIS specific index
              const hasBarrelWheel = parentContainer.querySelector(
                `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
              )

              // If no barrel wheel exists for THIS index and span is transparent, restore color
              // Only check the span at this index, not other spans with the same final digit
              if (isTransparent && !hasBarrelWheel) {
                spanAtIndex.style.color = ""
              }
            }
          }
        }
      })
    },
    [styles.barrel_wheel, cleanupWidthAnimation]
  )

  const updateValue = useCallback(
    (
      newText: string,
      newCursorPos: number,
      selectionStart: number,
      selectionEnd: number,
      skipHistory = false
    ) => {
      const oldText = displayValue

      // Validate and clean
      let cleanedText = newText.replace(/[^\d.-]/g, "")

      // Track if we're removing leading zeros (for animation fix)
      const _hadLeadingZero =
        cleanedText.startsWith("0") &&
        cleanedText.length > 1 &&
        cleanedText[1] !== "."

      // Ensure only one minus sign at the beginning
      const minusCount = (cleanedText.match(/-/g) || []).length
      if (minusCount > 1) {
        // Keep only the first minus
        cleanedText = cleanedText.replace(/-/g, (match, offset) =>
          offset === 0 ? match : ""
        )
      }
      // Remove minus if it's not at the beginning
      if (cleanedText.includes("-") && !cleanedText.startsWith("-")) {
        cleanedText = cleanedText.replace(/-/g, "")
      }

      // Ensure only one decimal point
      const dotCount = (cleanedText.match(/\./g) || []).length
      if (dotCount > 1) {
        // Keep only the first dot
        const firstDotIndex = cleanedText.indexOf(".")
        cleanedText =
          cleanedText.slice(0, firstDotIndex + 1) +
          cleanedText.slice(firstDotIndex + 1).replace(/\./g, "")
      }

      // Remove leading zeros (except for "0" itself or "0.")
      // Match patterns like "000123" -> "123" or "000.5" -> "0.5"
      let leadingZerosRemoved = 0
      if (
        cleanedText.length > 1 &&
        cleanedText[0] === "0" &&
        cleanedText[1] !== "."
      ) {
        // Count how many leading zeros we'll remove
        const match = cleanedText.match(/^0+/)
        leadingZerosRemoved = match ? match[0].length - 1 : 0
        // Remove leading zeros
        cleanedText = cleanedText.replace(/^0+/, "")
        // If we removed everything, keep one zero
        if (
          cleanedText === "" ||
          cleanedText.startsWith(".") ||
          cleanedText.startsWith("-")
        ) {
          cleanedText = "0" + cleanedText
          leadingZerosRemoved = 0
        }
        // Adjust cursor position if we removed leading zeros
        if (leadingZerosRemoved > 0 && newCursorPos > 0) {
          newCursorPos = Math.max(0, newCursorPos - leadingZerosRemoved)
        }
      }

      // Handle negative numbers with leading zeros
      if (cleanedText.startsWith("-") && cleanedText.length > 2) {
        const afterMinus = cleanedText.slice(1)
        if (afterMinus[0] === "0" && afterMinus[1] !== ".") {
          const cleaned = afterMinus.replace(/^0+/, "")
          cleanedText =
            "-" +
            (cleaned === "" || cleaned.startsWith(".")
              ? "0" + cleaned
              : cleaned)
        }
      }

      // Auto-add leading zero if configured
      if (autoAddLeadingZero) {
        if (cleanedText.startsWith(".")) {
          cleanedText = "0" + cleanedText
          newCursorPos += 1
        } else if (cleanedText.startsWith("-.")) {
          cleanedText = "-0" + cleanedText.slice(1)
          newCursorPos += 1
        }
      }

      // Handle invalid intermediate states
      // Note: We preserve trailing dots in displayValue but not in actualValue
      let numberValue: MaybeUndefined<number>
      if (
        cleanedText === "" ||
        cleanedText === "-" ||
        cleanedText === "." ||
        cleanedText === "-."
      ) {
        numberValue = undefined
      } else {
        // Parse the number (this will ignore trailing dots)
        const parsed = parseFloat(cleanedText)
        numberValue = isNaN(parsed) ? undefined : parsed
      }

      onChange?.(numberValue)
      setUncontrolledValue(numberValue)
      setDisplayValue(cleanedText)
      setCursorPosition(newCursorPos)

      // Add to history (unless this is an undo/redo operation)
      if (!skipHistory && !isUndoRedoRef.current) {
        // Remove any history after current index (when we make a new change after undoing)
        historyRef.current = historyRef.current.slice(
          0,
          historyIndexRef.current + 1
        )
        // Add new state to history
        historyRef.current.push({
          text: cleanedText,
          cursorPos: newCursorPos,
          value: numberValue,
        })
        historyIndexRef.current = historyRef.current.length - 1
        // Limit history size to prevent memory issues
        if (historyRef.current.length > 50) {
          historyRef.current.shift()
          historyIndexRef.current--
        }
      }

      // Update DOM with animation
      if (spanRef.current) {
        // Special handling for leading zero removal and decimal point deletion
        let adjustedOldText = oldText
        let adjustedSelectionStart = selectionStart
        let adjustedSelectionEnd = selectionEnd
        let adjustedNewCursorPos = newCursorPos

        // Check if we deleted a decimal point that was after a leading zero (e.g., "0.122" -> "122")
        const deletedDecimalAfterZero =
          oldText.startsWith("0.") &&
          !cleanedText.startsWith("0") &&
          cleanedText.length > 0 &&
          oldText.length > cleanedText.length &&
          oldText.includes(".") &&
          !cleanedText.includes(".")

        // Check if we're replacing a single leading "0" with a non-zero digit (e.g., "0" -> "1")
        const replacedLeadingZero =
          oldText === "0" &&
          cleanedText.length > 0 &&
          cleanedText[0] !== "0" &&
          !cleanedText.startsWith("0.")

        if (deletedDecimalAfterZero) {
          // When deleting "." from "0.122", we get "0122" which becomes "122"
          // We want all digits in "122" to have data-show, so we compare "" with "122"
          adjustedOldText = ""
          adjustedSelectionStart = 0
          adjustedSelectionEnd = 0
          adjustedNewCursorPos = cleanedText.length
        } else if (replacedLeadingZero) {
          // Special case: "0" -> "1" (or any non-zero digit)
          // We want to treat this as if we're starting from scratch
          adjustedOldText = ""
          adjustedSelectionStart = 0
          adjustedSelectionEnd = 0
          adjustedNewCursorPos = cleanedText.length
        } else if (leadingZerosRemoved > 0 && oldText.length > 0) {
          // If we removed leading zeros, adjust the oldText comparison
          if (
            oldText.startsWith("0") &&
            oldText.length > 1 &&
            oldText[1] !== "."
          ) {
            // More general case: if oldText was "0123" and we typed "4" to get "01234" which became "1234",
            // we need to adjust the comparison
            const oldWithoutLeadingZeros = oldText.replace(/^0+/, "")
            if (
              oldWithoutLeadingZeros ===
              cleanedText.slice(0, oldWithoutLeadingZeros.length)
            ) {
              // The old text (without leading zeros) matches the start of new text
              // This means we just added characters at the end
              adjustedOldText = oldWithoutLeadingZeros
              // Adjust selection and cursor positions to account for removed leading zeros
              adjustedSelectionStart = Math.max(
                0,
                selectionStart - leadingZerosRemoved
              )
              adjustedSelectionEnd = Math.max(
                0,
                selectionEnd - leadingZerosRemoved
              )
              adjustedNewCursorPos = Math.max(
                0,
                newCursorPos - leadingZerosRemoved
              )
            }
          }
        }
        const changes = getChanges(
          adjustedOldText,
          cleanedText,
          adjustedSelectionStart,
          adjustedSelectionEnd,
          adjustedNewCursorPos
        )

        // Update barrel wheel indices if characters were inserted before them
        if (spanRef.current?.parentElement) {
          const parentContainer = spanRef.current.parentElement
          const existingBarrelWheels = parentContainer.querySelectorAll(
            `[data-char-index].${styles.barrel_wheel || ""}`
          )
          existingBarrelWheels.forEach((wheel) => {
            const wheelEl = wheel as HTMLElement
            const oldIndexStr = wheelEl.getAttribute("data-char-index")
            const finalDigitStr = wheelEl.getAttribute("data-final-digit")
            if (oldIndexStr !== null) {
              const oldIndex = parseInt(oldIndexStr, 10)
              if (!isNaN(oldIndex) && oldIndex >= 0) {
                // Calculate how many characters were inserted before this index
                const lengthDiff = cleanedText.length - adjustedOldText.length
                const hadSelection =
                  adjustedSelectionStart < adjustedSelectionEnd

                // If characters were inserted (not replaced) at or before the barrel wheel's index, shift it
                if (
                  !hadSelection &&
                  lengthDiff > 0 &&
                  adjustedSelectionStart <= oldIndex
                ) {
                  // Characters were inserted at or before this index, so shift it
                  const numInserted =
                    adjustedNewCursorPos - adjustedSelectionStart
                  const newIndex = oldIndex + numInserted
                  wheelEl.setAttribute("data-char-index", newIndex.toString())

                  // Update the ResizeObserver key if it exists
                  const observer = resizeObserversRef.current.get(oldIndex)
                  if (observer) {
                    resizeObserversRef.current.delete(oldIndex)
                    resizeObserversRef.current.set(newIndex, observer)
                  }

                  // Also update the span's data-char-index if it exists and matches the final digit
                  if (finalDigitStr && spanRef.current) {
                    const oldSpan = spanRef.current.querySelector(
                      `[data-char-index="${oldIndex}"]`
                    ) as HTMLElement | null
                    if (oldSpan && oldSpan.textContent === finalDigitStr) {
                      oldSpan.setAttribute(
                        "data-char-index",
                        newIndex.toString()
                      )
                    }
                  }
                }
              }
            }
          })
        }

        // Incrementally update DOM instead of full reconstruction
        if (spanRef.current) {
          // First, update indices of existing spans that need to shift due to insertions
          // This handles the case where characters are inserted before existing spans
          // Do this BEFORE collecting spans by index, so the map is correct
          const lengthDiff = cleanedText.length - adjustedOldText.length
          const hadSelection = adjustedSelectionStart < adjustedSelectionEnd
          if (!hadSelection && lengthDiff > 0) {
            // Characters were inserted (not replaced) - shift existing spans at and after the insertion point
            const insertPos = adjustedSelectionStart
            const numInserted = adjustedNewCursorPos - adjustedSelectionStart
            // Collect all spans first
            const allSpans: HTMLElement[] = []
            let nodeToUpdate = spanRef.current.firstChild
            while (nodeToUpdate) {
              if (
                nodeToUpdate instanceof HTMLElement &&
                nodeToUpdate.hasAttribute("data-char-index")
              ) {
                allSpans.push(nodeToUpdate)
              }
              nodeToUpdate = nodeToUpdate.nextSibling
            }
            // Update indices of spans that need to shift
            allSpans.forEach((span) => {
              const oldIndexStr = span.getAttribute("data-char-index")
              if (oldIndexStr !== null) {
                const oldIndex = parseInt(oldIndexStr, 10)
                if (
                  !isNaN(oldIndex) &&
                  oldIndex >= insertPos &&
                  oldIndex < adjustedOldText.length
                ) {
                  const newIdx = oldIndex + numInserted
                  if (newIdx < cleanedText.length) {
                    span.setAttribute("data-char-index", newIdx.toString())
                  }
                }
              }
            })
          }

          // Get all existing spans mapped by index (after updating indices)
          // Also track transparent spans separately to handle them specially
          const existingSpansByIndex = new Map<number, HTMLElement>()
          const allExistingSpans: HTMLElement[] = []
          const transparentSpans = new Map<number, HTMLElement>() // Map of index -> transparent span
          // Also collect any text nodes that shouldn't be there (from undo/redo textContent assignment)
          const textNodesToRemove: Node[] = []
          let node = spanRef.current.firstChild
          while (node) {
            if (
              node instanceof HTMLElement &&
              node.hasAttribute("data-char-index")
            ) {
              const index = parseInt(
                node.getAttribute("data-char-index") ?? "-1",
                10
              )
              if (index >= 0) {
                // Check if this is a transparent span (barrel wheel animation)
                const isTransparent =
                  node.style.color === "transparent" ||
                  node.style.color === "rgba(0, 0, 0, 0)" ||
                  window.getComputedStyle(node).color === "rgba(0, 0, 0, 0)"
                if (isTransparent) {
                  // Track transparent spans separately - they might have shifted indices
                  transparentSpans.set(index, node)
                }
                // Only add to existingSpansByIndex if there isn't already a span at this index
                // If there's a duplicate, prefer the non-transparent one
                if (!existingSpansByIndex.has(index) || !isTransparent) {
                  existingSpansByIndex.set(index, node)
                }
                allExistingSpans.push(node)
              }
            } else if (node.nodeType === Node.TEXT_NODE) {
              // Collect text nodes that shouldn't be there (they should be inside spans)
              textNodesToRemove.push(node)
            }
            node = node.nextSibling
          }

          // Remove any stray text nodes (from undo/redo or other operations)
          textNodesToRemove.forEach((textNode) => {
            if (textNode.parentNode) {
              textNode.parentNode.removeChild(textNode)
            }
          })

          // Track which spans we've used
          const usedSpans = new Set<HTMLElement>()
          const newSpans: HTMLElement[] = []
          let referenceNode: Node | null = null

          // Build new structure, reusing existing spans when possible
          // Get parent container once for barrel wheel checks
          const parentContainer = spanRef.current.parentElement

          for (let i = 0; i < cleanedText.length; i++) {
            const char = cleanedText[i]
            const isUnchanged = changes.unchangedIndices.has(i)
            const barrelWheel = changes.barrelWheelIndices.get(i)

            // Check if there's a barrel wheel in DOM for this index (indices may have shifted)
            const hasBarrelWheelInDOM = parentContainer?.querySelector(
              `[data-char-index="${i}"].${styles.barrel_wheel || ""}`
            )
            const hasBarrelWheel =
              barrelWheel !== undefined || !!hasBarrelWheelInDOM

            // Try to reuse existing span at this index
            let span = existingSpansByIndex.get(i)
            let shouldReuse = false

            // Only reuse if this index is marked as unchanged (not added)
            // New characters should always get new spans to trigger animations
            const isAdded = changes.addedIndices.has(i)
            const isUnchangedIndex = changes.unchangedIndices.has(i)

            if (
              span &&
              span.textContent === char &&
              !usedSpans.has(span) &&
              !isAdded &&
              isUnchangedIndex
            ) {
              // Check if span is in approximately the right position
              // (within 2 positions is acceptable to avoid unnecessary reordering)
              let currentPos = 0
              let node = spanRef.current.firstChild
              while (node && node !== span) {
                if (
                  node instanceof HTMLElement &&
                  node.hasAttribute("data-char-index")
                ) {
                  currentPos++
                }
                node = node.nextSibling
              }

              if (Math.abs(currentPos - i) <= 2) {
                shouldReuse = true
              }
            }

            if (shouldReuse && span) {
              // Reuse existing span - ensure textContent matches (defensive check)
              if (span.textContent !== char) {
                span.textContent = char ?? ""
              }

              // Update attributes if needed
              const shouldHaveFlow = !barrelWheel
              const shouldHaveShow = isUnchanged
              const hasFlow = span.hasAttribute("data-flow")
              const hasShow = span.hasAttribute("data-show")

              if (shouldHaveFlow && !hasFlow) {
                span.setAttribute("data-flow", "")
              } else if (!shouldHaveFlow && hasFlow) {
                span.removeAttribute("data-flow")
              }

              if (shouldHaveShow && !hasShow) {
                span.setAttribute("data-show", "")
              } else if (!shouldHaveShow && hasShow) {
                span.removeAttribute("data-show")
              }

              usedSpans.add(span)
              // Move to correct position if needed
              if (referenceNode) {
                const nextSibling = referenceNode.nextSibling
                if (span.previousSibling !== referenceNode && nextSibling) {
                  spanRef.current.insertBefore(span, nextSibling)
                } else if (!nextSibling) {
                  spanRef.current.appendChild(span)
                }
              }
              referenceNode = span
            } else {
              // Check if there's an existing span that's currently animating (barrel wheel or width)
              // First check if there's a transparent span at this index (might have shifted)
              let existingSpan = existingSpansByIndex.get(i)
              // If no span at this index, check if there's a transparent span that shifted here
              if (!existingSpan && transparentSpans.has(i)) {
                existingSpan = transparentSpans.get(i)!
              }
              const hasWidthAnimation =
                existingSpan?.hasAttribute("data-width-animate")
              // Check if span is hidden (indicates barrel wheel animation in progress)
              const isHidden =
                existingSpan?.style.color === "transparent" ||
                existingSpan?.style.color === "rgba(0, 0, 0, 0)" ||
                (existingSpan &&
                  window.getComputedStyle(existingSpan).color ===
                    "rgba(0, 0, 0, 0)")

              // Don't reuse span if there's a barrel wheel animation for this index
              // The barrel wheel code needs to set up width animation, so let it handle the span
              // Only reuse if it's a width animation without barrel wheel (width animation cleanup)
              const shouldReuseSpan =
                !hasBarrelWheel &&
                hasWidthAnimation &&
                !isHidden &&
                existingSpan &&
                !usedSpans.has(existingSpan)

              // IMPORTANT: If there's a transparent span at this index, it's part of an ongoing barrel wheel
              // We MUST reuse it, even if changes.barrelWheelIndices doesn't have this index
              // (because the barrel wheel's index may have shifted)
              const shouldReuseTransparentSpan =
                isHidden &&
                existingSpan &&
                !usedSpans.has(existingSpan) &&
                (hasBarrelWheel || hasBarrelWheelInDOM)

              // If there's a transparent span (barrel wheel animation), reuse it
              if (shouldReuseTransparentSpan && existingSpan) {
                // Reuse the transparent span - it's part of an ongoing barrel wheel animation
                span = existingSpan
                // Update textContent if needed (should match the final digit)
                if (span.textContent !== char) {
                  span.textContent = char ?? ""
                }
                // Ensure data-char-index is correct
                span.setAttribute("data-char-index", i.toString())
                // Keep it transparent (barrel wheel is still animating)
                span.style.color = "transparent"
                // Don't set data-flow (barrel wheel handles it)
                span.removeAttribute("data-flow")
                if (isUnchanged) {
                  span.setAttribute("data-show", "")
                } else {
                  span.removeAttribute("data-show")
                }
                usedSpans.add(span)
                // Ensure it's in the correct position
                if (referenceNode) {
                  const nextSibling = referenceNode.nextSibling
                  if (span.previousSibling !== referenceNode && nextSibling) {
                    spanRef.current.insertBefore(span, nextSibling)
                  } else if (!nextSibling) {
                    spanRef.current.appendChild(span)
                  }
                }
                referenceNode = span
              } else if (shouldReuseSpan && existingSpan) {
                // If there's an existing span that's animating width (not barrel wheel), update it
                // Update the existing animating span
                span = existingSpan
                // Update textContent if it changed (shouldn't happen during barrel wheel, but defensive)
                if (span.textContent !== char) {
                  span.textContent = char ?? ""
                }
                // Update data-char-index to ensure it's correct
                span.setAttribute("data-char-index", i.toString())

                // Update attributes
                if (!barrelWheel) {
                  span.setAttribute("data-flow", "")
                } else {
                  span.removeAttribute("data-flow")
                }
                if (isUnchanged) {
                  span.setAttribute("data-show", "")
                } else {
                  span.removeAttribute("data-show")
                }

                usedSpans.add(span)
                // Ensure it's in the correct position
                if (referenceNode) {
                  const nextSibling = referenceNode.nextSibling
                  if (span.previousSibling !== referenceNode && nextSibling) {
                    spanRef.current.insertBefore(span, nextSibling)
                  } else if (!nextSibling) {
                    spanRef.current.appendChild(span)
                  }
                }
                referenceNode = span
              } else {
                // If there's a barrel wheel animation, we need to ensure the span exists
                // but let the barrel wheel code handle width animation setup
                // So we'll update the existing span if it exists, or create a new one
                if (
                  hasBarrelWheel &&
                  existingSpan &&
                  !usedSpans.has(existingSpan)
                ) {
                  // Update existing span for barrel wheel - barrel wheel code will handle width animation
                  span = existingSpan

                  // Preserve old width BEFORE updating textContent to prevent flash
                  // Get the current width (which is the old digit's width)
                  const oldWidth = span.getBoundingClientRect().width

                  // Ensure display is inline-block so width can be applied
                  span.style.display = "inline-block"

                  // Constrain to old width IMMEDIATELY before updating textContent
                  // This prevents flash of natural width when textContent changes
                  if (oldWidth > 0) {
                    span.style.width = `${oldWidth}px`
                    span.style.minWidth = `${oldWidth}px`
                    span.style.maxWidth = `${oldWidth}px`
                    // Force reflow to ensure width constraint is applied
                    void span.offsetWidth
                  }

                  // NOW update textContent (span is already constrained, so no flash)
                  if (span.textContent !== char) {
                    span.textContent = char ?? ""
                  }

                  // Update data-char-index to ensure it's correct
                  span.setAttribute("data-char-index", i.toString())
                  // Don't set data-flow for barrel wheel (barrel wheel code handles it)
                  span.removeAttribute("data-flow")
                  if (isUnchanged) {
                    span.setAttribute("data-show", "")
                  } else {
                    span.removeAttribute("data-show")
                  }
                  // Reset color in case it was hidden from previous animation
                  span.style.color = ""
                  // Remove data-width-animate if present (barrel wheel code will add it)
                  span.removeAttribute("data-width-animate")
                  usedSpans.add(span)
                  // Ensure it's in the correct position
                  if (referenceNode) {
                    const nextSibling = referenceNode.nextSibling
                    if (span.previousSibling !== referenceNode && nextSibling) {
                      spanRef.current.insertBefore(span, nextSibling)
                    } else if (!nextSibling) {
                      spanRef.current.appendChild(span)
                    }
                  }
                  referenceNode = span
                } else {
                  // Check if there's a transparent span at this index that should be preserved
                  // This handles the case where a transparent span was shifted from a previous index
                  // when we inserted a character before the animating digit
                  if (
                    isHidden &&
                    existingSpan &&
                    !usedSpans.has(existingSpan)
                  ) {
                    // This is a transparent span - it's part of an ongoing barrel wheel animation
                    // Reuse it instead of creating a new one
                    span = existingSpan
                    // Update textContent if needed (should match the final digit)
                    if (span.textContent !== char) {
                      span.textContent = char ?? ""
                    }
                    // Ensure data-char-index is correct
                    span.setAttribute("data-char-index", i.toString())
                    // Keep it transparent (barrel wheel is still animating)
                    span.style.color = "transparent"
                    // Don't set data-flow (barrel wheel handles it)
                    span.removeAttribute("data-flow")
                    if (isUnchanged) {
                      span.setAttribute("data-show", "")
                    } else {
                      span.removeAttribute("data-show")
                    }
                    usedSpans.add(span)
                    // Ensure it's in the correct position
                    if (referenceNode) {
                      const nextSibling = referenceNode.nextSibling
                      if (
                        span.previousSibling !== referenceNode &&
                        nextSibling
                      ) {
                        spanRef.current.insertBefore(span, nextSibling)
                      } else if (!nextSibling) {
                        spanRef.current.appendChild(span)
                      }
                    }
                    referenceNode = span
                  } else {
                    // Remove existing span at this index if it exists and doesn't match
                    if (existingSpan && existingSpan.textContent !== char) {
                      // Only remove if not animating (not hidden and not part of current barrel wheel)
                      const isCurrentlyAnimating =
                        (isHidden && !hasBarrelWheel) ||
                        (hasWidthAnimation && !hasBarrelWheel)
                      if (!isCurrentlyAnimating) {
                        existingSpan.remove()
                        existingSpansByIndex.delete(i)
                        usedSpans.delete(existingSpan)
                      }
                    }

                    // Create new span
                    span = document.createElement("span")
                    span.setAttribute("data-char-index", i.toString())
                    span.textContent = char ?? ""

                    if (!barrelWheel) {
                      span.setAttribute("data-flow", "")
                    }
                    if (isUnchanged) {
                      span.setAttribute("data-show", "")
                    }

                    // Insert at correct position
                    if (referenceNode) {
                      spanRef.current.insertBefore(
                        span,
                        referenceNode.nextSibling
                      )
                    } else {
                      spanRef.current.insertBefore(
                        span,
                        spanRef.current.firstChild
                      )
                    }
                    referenceNode = span
                  }
                }
              }
            }

            newSpans.push(span)
          }

          // Remove unused spans that aren't animating
          // Also check for spans that are hidden (color: transparent) which indicates barrel wheel animation
          // IMPORTANT: Check for barrel wheels in DOM, not just changes.barrelWheelIndices,
          // because indices may have shifted when characters were inserted before animating digits
          allExistingSpans.forEach((span) => {
            if (!usedSpans.has(span)) {
              const index = parseInt(
                span.getAttribute("data-char-index") ?? "-1",
                10
              )
              const isHidden =
                span.style.color === "transparent" ||
                span.style.color === "rgba(0, 0, 0, 0)" ||
                window.getComputedStyle(span).color === "rgba(0, 0, 0, 0)"
              // Check if there's actually a barrel wheel for this index in the DOM
              // (indices may have shifted, so changes.barrelWheelIndices might not be accurate)
              const hasBarrelWheelInDOM = parentContainer?.querySelector(
                `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
              )
              const hasBarrelWheel =
                changes.barrelWheelIndices.has(index) || !!hasBarrelWheelInDOM
              const hasWidthAnimation = span.hasAttribute("data-width-animate")
              const isCurrentlyAnimating =
                hasBarrelWheel || hasWidthAnimation || isHidden

              // If text is empty, remove all spans regardless of animation state
              // This handles the case where user selects all and deletes
              if (cleanedText.length === 0) {
                span.remove()
              } else if (!isCurrentlyAnimating) {
                // Only remove if not currently animating
                span.remove()
              }
            }
          })

          // Final verification: ensure all spans have correct textContent
          // This catches any cases where spans weren't properly updated
          for (let i = 0; i < cleanedText.length; i++) {
            const char = cleanedText[i]
            const span = newSpans[i]
            if (span && span.textContent !== char) {
              span.textContent = char ?? ""
            }
          }

          // Reposition all barrel wheels after DOM update completes
          // This ensures barrel wheels stay aligned whenever characters are inserted/deleted
          // Use requestAnimationFrame to ensure DOM has fully updated
          requestAnimationFrame(() => {
            repositionAllBarrelWheels()
          })

          // Remove any remaining spans with invalid indices or wrong characters
          // Also check for duplicate indices and transparent spans that are ghosts
          const allSpans = Array.from(
            spanRef.current.querySelectorAll("[data-char-index]")
          ) as HTMLElement[]

          // Track spans by index to detect duplicates
          const spansByIndex = new Map<number, HTMLElement[]>()
          allSpans.forEach((span) => {
            const index = parseInt(
              span.getAttribute("data-char-index") ?? "-1",
              10
            )
            if (index >= 0) {
              if (!spansByIndex.has(index)) {
                spansByIndex.set(index, [])
              }
              spansByIndex.get(index)!.push(span)
            }
          })

          // Handle duplicate indices - keep the one that's animating or matches the character, remove others
          spansByIndex.forEach((spans, index) => {
            if (spans.length > 1) {
              // Find the span that should be kept
              let spanToKeep: HTMLElement | null = null

              // First, try to find one that matches the expected character
              const expectedChar = cleanedText[index]
              for (const span of spans) {
                if (span.textContent === expectedChar) {
                  const isHidden =
                    span.style.color === "transparent" ||
                    span.style.color === "rgba(0, 0, 0, 0)" ||
                    window.getComputedStyle(span).color === "rgba(0, 0, 0, 0)"
                  // Prefer non-transparent spans that match the character
                  if (!isHidden) {
                    spanToKeep = span
                    break
                  } else if (!spanToKeep) {
                    // Keep transparent one as fallback if it matches
                    spanToKeep = span
                  }
                }
              }

              // If no matching character found, find the animating one
              if (!spanToKeep) {
                for (const span of spans) {
                  const isHidden =
                    span.style.color === "transparent" ||
                    span.style.color === "rgba(0, 0, 0, 0)" ||
                    window.getComputedStyle(span).color === "rgba(0, 0, 0, 0)"
                  const hasBarrelWheelInDOM = parentContainer?.querySelector(
                    `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
                  )
                  const hasWidthAnimation =
                    span.hasAttribute("data-width-animate")
                  if (isHidden || hasBarrelWheelInDOM || hasWidthAnimation) {
                    spanToKeep = span
                    break
                  }
                }
              }

              // If still no span found, keep the first one
              if (!spanToKeep && spans.length > 0) {
                const firstSpan = spans.find(() => true)
                if (firstSpan) {
                  spanToKeep = firstSpan
                }
              }

              // Remove all other spans at this index
              if (spanToKeep) {
                spans.forEach((span) => {
                  if (span !== spanToKeep) {
                    span.remove()
                  }
                })
              }
            }
          })

          // Now check remaining spans for out-of-bounds or wrong characters
          const remainingSpans = Array.from(
            spanRef.current.querySelectorAll("[data-char-index]")
          ) as HTMLElement[]
          remainingSpans.forEach((span) => {
            const index = parseInt(
              span.getAttribute("data-char-index") ?? "-1",
              10
            )
            const isHidden =
              span.style.color === "transparent" ||
              span.style.color === "rgba(0, 0, 0, 0)" ||
              window.getComputedStyle(span).color === "rgba(0, 0, 0, 0)"
            // Check if there's actually a barrel wheel for this index in the DOM
            const hasBarrelWheelInDOM = parentContainer?.querySelector(
              `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
            )
            const hasBarrelWheel =
              changes.barrelWheelIndices.has(index) || !!hasBarrelWheelInDOM
            const hasWidthAnimation = span.hasAttribute("data-width-animate")
            const isCurrentlyAnimating =
              hasBarrelWheel || hasWidthAnimation || isHidden

            // If text is empty, remove all spans
            if (cleanedText.length === 0) {
              span.remove()
              return
            }

            // Remove if index is out of bounds
            // For short cleanedText (like "-"), we should be more aggressive about removing out-of-bounds spans
            // to prevent ghost characters
            if (index < 0 || index >= cleanedText.length) {
              // Remove out-of-bounds spans unless they're currently animating AND cleanedText is long enough
              // This prevents ghost characters when cleanedText changes significantly (e.g., "1881" -> "-")
              if (!isCurrentlyAnimating || cleanedText.length <= 1) {
                span.remove()
              }
            } else if (span.textContent !== cleanedText[index]) {
              // Character mismatch - update or remove
              // If it's a transparent span with wrong character and no barrel wheel, it's a ghost - remove it
              if (isHidden && !hasBarrelWheelInDOM && !hasBarrelWheel) {
                span.remove()
              } else if (!isCurrentlyAnimating) {
                // Update textContent to match
                span.textContent = cleanedText[index] ?? ""
              }
            }
          })
        }

        // Animate new characters and create barrel wheels
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          const flowElements = spanRef.current?.querySelectorAll("[data-flow]")
          if (flowElements) {
            Array.from(flowElements).forEach((element) => {
              const index = parseInt(
                (element as HTMLElement).getAttribute("data-char-index") ??
                  "-1",
                10
              )
              if (
                element instanceof HTMLElement &&
                changes.addedIndices.has(index)
              ) {
                element.dataset.show = ""
              }
            })
          }

          // Create barrel wheels as absolutely positioned elements outside contentEditable
          const barrelWheelIndices = Array.from(
            changes.barrelWheelIndices.keys()
          )
          barrelWheelIndices.forEach((index) => {
            const barrelWheelData = changes.barrelWheelIndices.get(index)
            if (!barrelWheelData) return

            const direction = barrelWheelData.direction
            const finalDigitStr =
              barrelWheelData.sequence[barrelWheelData.sequence.length - 1]
            const finalDigit = finalDigitStr ? parseInt(finalDigitStr, 10) : 0
            const initialDigitStr = barrelWheelData.sequence[0]

            // Determine old and new digits based on direction
            // When direction is "up": sequence = [old, ..., new] so initialDigitStr = old, finalDigitStr = new
            // When direction is "down": sequence = [new, ..., old] so initialDigitStr = new, finalDigitStr = old
            const oldDigitStr =
              direction === "up" ? initialDigitStr : finalDigitStr
            const newDigitStr =
              direction === "up" ? finalDigitStr : initialDigitStr

            // Find the span element at this index
            const charSpan = spanRef.current?.querySelector(
              `[data-char-index="${index}"]`
            )
            if (!charSpan || !(charSpan instanceof HTMLElement)) return

            // Get position of the character span relative to the parent container
            const parentContainer = spanRef.current?.parentElement
            if (!parentContainer) return

            // Check if a barrel wheel already exists for this index
            const existingWheel = parentContainer.querySelector(
              `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
            ) as HTMLElement | null

            if (existingWheel) {
              // Reuse existing barrel wheel - update direction and position
              const existingWrapper = existingWheel.querySelector(
                `.${styles.barrel_digits_wrapper || ""}`
              ) as HTMLElement | null

              if (existingWrapper) {
                // IMPORTANT: Update the character span's textContent to the new digit
                // This ensures the span has the correct final digit when the animation completes
                if (charSpan.textContent !== newDigitStr) {
                  charSpan.textContent = newDigitStr ?? ""
                }

                existingWheel.setAttribute(
                  "data-final-digit",
                  newDigitStr ?? ""
                )

                requestAnimationFrame(() => {
                  existingWrapper.style.setProperty(
                    "--digit-position",
                    newDigitStr ?? ""
                  )
                })

                // Update width animation if needed
                // Measure the old digit's width (current digit being replaced)
                let oldDigitWidth = 0
                if (oldDigitStr && charSpan) {
                  oldDigitWidth = measureText(oldDigitStr, charSpan)
                }

                // Measure the new digit's width (final digit)
                let newDigitWidth = 0
                if (newDigitStr && charSpan) {
                  newDigitWidth = measureText(newDigitStr, charSpan)
                }

                // Update width animation
                if (oldDigitWidth > 0 && newDigitWidth > 0) {
                  // Ensure span can have width applied
                  charSpan.style.display = "inline-block"

                  // Get current width (might be mid-animation)
                  const currentWidth = charSpan.getBoundingClientRect().width

                  // Set initial width to current width (where we're starting from)
                  charSpan.style.width = `${currentWidth}px`
                  charSpan.style.minWidth = `${currentWidth}px`
                  charSpan.style.maxWidth = `${currentWidth}px`

                  // Add attribute to enable CSS transition
                  charSpan.setAttribute("data-width-animate", "")

                  // Start width animation in the next frame
                  requestAnimationFrame(() => {
                    // Change width - this should trigger the CSS transition
                    charSpan.style.width = `${newDigitWidth}px`
                    charSpan.style.minWidth = `${newDigitWidth}px`
                    charSpan.style.maxWidth = `${newDigitWidth}px`
                  })
                }

                // Update barrel wheel position
                const rect = charSpan.getBoundingClientRect()
                const parentRect = parentContainer.getBoundingClientRect()
                existingWheel.style.left = `${rect.left - parentRect.left}px`
                existingWheel.style.top = `${rect.top - parentRect.top}px`
                existingWheel.style.width = `${rect.width}px`
                existingWheel.style.height = `${rect.height}px`

                // Ensure the character span is transparent
                charSpan.style.color = "transparent"

                // Skip creating a new barrel wheel - we've reused the existing one
                return
              }
            }

            // Measure the old digit's width (previous digit) - this will be the initial width
            let oldDigitWidth = 0
            if (oldDigitStr && charSpan) {
              oldDigitWidth = measureText(oldDigitStr, charSpan)
            }

            // Measure the new digit's width (final digit) - this will be the destination width
            let newDigitWidth = 0
            if (newDigitStr && charSpan) {
              newDigitWidth = measureText(newDigitStr, charSpan)
            }

            // Create barrel wheel element
            const wheel = document.createElement("span")
            wheel.className = styles.barrel_wheel || ""
            wheel.setAttribute("data-direction", direction)
            wheel.setAttribute("data-final-digit", finalDigit.toString())
            wheel.setAttribute("data-char-index", index.toString())

            // Create wrapper
            const wrapper = document.createElement("div")
            wrapper.className = styles.barrel_digits_wrapper || ""
            wrapper.style.position = "relative"
            // wrapper.style.flexDirection =
            //   direction === "up" ? "column" : "column-reverse"

            // Create ALL digits from 0 to 9 (always)
            for (let digit = 0; digit <= 9; digit++) {
              const digitStr = digit.toString()
              const digitElement = document.createElement("div")
              digitElement.className = styles.barrel_digit || ""
              digitElement.setAttribute("data-digit", digitStr)
              digitElement.textContent = digitStr
              digitElement.style.position = "relative"
              digitElement.style.height = "1em"
              digitElement.style.lineHeight = "1em"
              wrapper.appendChild(digitElement)
            }

            const rect = charSpan.getBoundingClientRect()
            const parentRect = parentContainer.getBoundingClientRect()

            wheel.style.position = "absolute"
            wheel.style.left = `${rect.left - parentRect.left}px`
            wheel.style.top = `${rect.top - parentRect.top}px`
            wheel.style.width = `${rect.width}px`
            wheel.style.height = `${rect.height}px`
            wheel.style.display = "flex"

            // Hide the original character span (barrel wheel will show it)
            charSpan.style.color = "transparent"

            wheel.appendChild(wrapper)
            parentContainer.appendChild(wheel)

            // Set initial width constraint SYNCHRONOUSLY to prevent flash of natural width
            // This must happen IMMEDIATELY after span is created/updated, before any rendering
            if (oldDigitWidth > 0 && newDigitWidth > 0) {
              // Ensure span can have width applied (inline elements can't have width)
              charSpan.style.display = "inline-block"
              // Set initial width constraints IMMEDIATELY to prevent flash
              // Do this synchronously, not in requestAnimationFrame
              charSpan.style.width = `${oldDigitWidth}px`
              charSpan.style.minWidth = `${oldDigitWidth}px`
              charSpan.style.maxWidth = `${oldDigitWidth}px`
              // Force a synchronous reflow to ensure width is applied before any rendering
              void charSpan.offsetWidth
              // Add attribute to enable CSS transition (but don't trigger animation yet)
              charSpan.setAttribute("data-width-animate", "")
              // Force another reflow to ensure transition CSS is ready
              void charSpan.offsetWidth
            }

            // Position the barrel wheel over the character
            requestAnimationFrame(() => {
              // Verify width constraints are still set (defensive check)
              if (oldDigitWidth > 0 && newDigitWidth > 0) {
                // Ensure initial width is still set (should be, but verify)
                if (!charSpan.style.width || charSpan.style.width === "") {
                  charSpan.style.width = `${oldDigitWidth}px`
                  charSpan.style.minWidth = `${oldDigitWidth}px`
                  charSpan.style.maxWidth = `${oldDigitWidth}px`
                  void charSpan.offsetWidth
                }
                // Ensure attribute is set
                if (!charSpan.hasAttribute("data-width-animate")) {
                  charSpan.setAttribute("data-width-animate", "")
                  void charSpan.offsetWidth
                }
              }

              // The sequence contains digits from old to new (inclusive)
              // Position 0 = old digit (first in sequence)
              // Position sequence.length - 1 = new digit (last in sequence)
              const initialPosition = oldDigitStr
                ? parseInt(oldDigitStr, 10)
                : 0 // Start at first digit in sequence (old digit)
              const finalPosition = newDigitStr ? parseInt(newDigitStr, 10) : 0 // End at last digit in sequence (new digit)

              // Set initial position using CSS variable (no transition yet)
              // Position 0 means translateY(0) - showing the first digit (old digit)
              wrapper.style.setProperty(
                "--digit-position",
                initialPosition.toString()
              )

              // Force a reflow to ensure the initial state is rendered
              // void wrapper.offsetHeight

              // Trigger animation from old digit to new digit
              // Use requestAnimationFrame to ensure initial state is painted
              requestAnimationFrame(() => {
                // Add animating class to enable transition
                wrapper.classList.add(styles.animating || "")

                // Force a reflow to ensure transition is applied
                // void wrapper.offsetHeight

                // Now update to final digit in the next frame - this will trigger the smooth animation
                requestAnimationFrame(() => {
                  // Change the CSS variable - browser will animate the transform from current to new value
                  // Position finalPosition means translateY(calc(finalPosition * -1em)) - showing the last digit (new digit)
                  wrapper.style.setProperty(
                    "--digit-position",
                    finalPosition.toString()
                  )

                  // Start width animation in parallel with barrel wheel animation
                  // Animate from old digit width (previous) to new digit width (final)
                  if (oldDigitWidth > 0 && newDigitWidth > 0) {
                    // Verify initial width is set (should already be set above)
                    const currentWidth = charSpan.style.width
                    if (!currentWidth || currentWidth === "") {
                      // Fallback: set initial width if somehow not set
                      charSpan.style.width = `${oldDigitWidth}px`
                      charSpan.style.minWidth = `${oldDigitWidth}px`
                      charSpan.style.maxWidth = `${oldDigitWidth}px`
                      void charSpan.offsetWidth
                    }

                    // Ensure data-width-animate is set and transition is ready
                    if (!charSpan.hasAttribute("data-width-animate")) {
                      charSpan.setAttribute("data-width-animate", "")
                    }
                    // Ensure display is inline-block for width to work
                    if (
                      window.getComputedStyle(charSpan).display !==
                      "inline-block"
                    ) {
                      charSpan.style.display = "inline-block"
                    }

                    // Force a reflow to ensure initial width and CSS transition are applied
                    void charSpan.offsetWidth

                    // Set up ResizeObserver to update barrel wheel position as digit width animates
                    // Clean up any existing observer for this index
                    const existingObserver =
                      resizeObserversRef.current.get(index)
                    if (existingObserver) {
                      existingObserver.disconnect()
                      resizeObserversRef.current.delete(index)
                    }

                    // Create new ResizeObserver for this digit
                    const resizeObserver = new ResizeObserver(() => {
                      // Update barrel wheel position to match digit's current position
                      if (!spanRef.current || !charSpan) return
                      const parentContainer = spanRef.current.parentElement
                      if (!parentContainer) return

                      const barrelWheel = parentContainer.querySelector(
                        `[data-char-index="${index}"].${
                          styles.barrel_wheel || ""
                        }`
                      ) as HTMLElement | null

                      if (barrelWheel) {
                        const rect = charSpan.getBoundingClientRect()
                        const parentRect =
                          parentContainer.getBoundingClientRect()
                        barrelWheel.style.left = `${
                          rect.left - parentRect.left
                        }px`
                        // Also update width to match current digit width
                        barrelWheel.style.width = `${rect.width}px`
                      }
                    })

                    // Start observing the digit span
                    resizeObserver.observe(charSpan)
                    resizeObserversRef.current.set(index, resizeObserver)

                    // Wait one more frame to ensure CSS transition is fully active
                    requestAnimationFrame(() => {
                      // Force another reflow to ensure CSS transition is applied
                      void charSpan.offsetWidth

                      // Verify transition is active by checking computed style
                      const computedStyle = window.getComputedStyle(charSpan)
                      const transition = computedStyle.transition

                      // If transition isn't active, try setting it inline as fallback
                      if (
                        !transition ||
                        transition === "none" ||
                        transition === "all 0s ease 0s"
                      ) {
                        charSpan.style.transition =
                          "width 0.4s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.4s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                        // Force reflow after setting inline transition
                        void charSpan.offsetWidth
                      }

                      // Change width - this should trigger the CSS transition
                      charSpan.style.width = `${newDigitWidth}px`
                      charSpan.style.minWidth = `${newDigitWidth}px`
                      charSpan.style.maxWidth = `${newDigitWidth}px`

                      // Listen for width animation completion
                      const handleWidthAnimationEnd = (e: TransitionEvent) => {
                        // Only handle width-related transitions
                        if (
                          e.propertyName === "width" ||
                          e.propertyName === "min-width" ||
                          e.propertyName === "max-width"
                        ) {
                          // Clean up width animation styles and attributes
                          cleanupWidthAnimation(charSpan)
                          charSpan.removeEventListener(
                            "transitionend",
                            handleWidthAnimationEnd
                          )

                          // Clean up ResizeObserver when width animation completes
                          const observer = resizeObserversRef.current.get(index)
                          if (observer) {
                            observer.disconnect()
                            resizeObserversRef.current.delete(index)
                          }
                        }
                      }
                      charSpan.addEventListener(
                        "transitionend",
                        handleWidthAnimationEnd
                      )
                    })
                  }

                  // After barrel wheel animation, remove barrel wheel and show the character without animation
                  wrapper.addEventListener(
                    "transitionend",
                    () => {
                      // Get the current index and final digit from the barrel wheel's attributes
                      // (may have changed if chars were inserted before)
                      const currentIndexStr =
                        wheel.getAttribute("data-char-index")
                      const currentIndex =
                        currentIndexStr !== null
                          ? parseInt(currentIndexStr, 10)
                          : index
                      const finalDigitAttr =
                        wheel.getAttribute("data-final-digit")
                      const finalDigit =
                        finalDigitAttr !== null ? finalDigitAttr : newDigitStr

                      // Clean up ResizeObserver when barrel wheel animation completes
                      // Check both old and new index in case it was updated
                      const observer =
                        resizeObserversRef.current.get(currentIndex) ||
                        resizeObserversRef.current.get(index)
                      if (observer) {
                        observer.disconnect()
                        resizeObserversRef.current.delete(currentIndex)
                        resizeObserversRef.current.delete(index)
                      }

                      // Find the span by the current index AND verify it has the correct character
                      // This handles the case where characters were inserted before the barrel wheel
                      let targetSpan: HTMLElement | null = null
                      if (spanRef.current) {
                        const spanAtCurrentIndex =
                          spanRef.current.querySelector(
                            `[data-char-index="${currentIndex}"]`
                          ) as HTMLElement | null

                        // Verify the span has the correct character (final digit)
                        // IMPORTANT: Only use the span at currentIndex, not other spans with the same digit
                        // This prevents conflicts when multiple barrel wheels have the same final digit
                        if (
                          spanAtCurrentIndex &&
                          spanAtCurrentIndex.textContent === finalDigit
                        ) {
                          targetSpan = spanAtCurrentIndex
                        } else if (spanAtCurrentIndex) {
                          // Span exists at index but has wrong character - this shouldn't happen, but use it anyway
                          // since it's at the correct index (the barrel wheel's index)
                          targetSpan = spanAtCurrentIndex
                        }
                      }

                      // If we still haven't found the span, use the one from closure as last resort
                      if (!targetSpan && charSpan instanceof HTMLElement) {
                        // Only use it if it hasn't been reused for a different character
                        if (charSpan.textContent === finalDigit) {
                          // Update its index if needed
                          const spanIndex =
                            charSpan.getAttribute("data-char-index")
                          if (spanIndex !== currentIndex.toString()) {
                            charSpan.setAttribute(
                              "data-char-index",
                              currentIndex.toString()
                            )
                          }
                          targetSpan = charSpan
                        }
                      }

                      // Helper function to remove color: transparent from a span
                      const removeTransparentColor = (span: HTMLElement) => {
                        if (
                          span.style.color === "transparent" ||
                          span.style.color === "rgba(0, 0, 0, 0)" ||
                          span.style.color === ""
                        ) {
                          span.style.color = ""
                        }
                        // Also check computed style as a fallback
                        const computedColor =
                          window.getComputedStyle(span).color
                        if (
                          computedColor === "rgba(0, 0, 0, 0)" ||
                          computedColor === "transparent"
                        ) {
                          span.style.color = ""
                        }
                      }

                      // Clean up width animation styles and attributes
                      if (targetSpan instanceof HTMLElement) {
                        cleanupWidthAnimation(targetSpan)
                        // Always remove color: transparent when barrel wheel completes
                        removeTransparentColor(targetSpan)
                        // Ensure the character doesn't have any animation attributes
                        targetSpan.removeAttribute("data-flow")
                        targetSpan.style.transition = "none"
                      }

                      // Additional safety: Before removing barrel wheel, ensure we've cleaned up the span
                      // at the current index ONLY (not other spans with the same final digit)
                      // This catches edge cases where the span wasn't found above, but only affects THIS barrel wheel's span
                      if (!targetSpan && spanRef.current) {
                        const spanAtCurrentIndex =
                          spanRef.current.querySelector(
                            `[data-char-index="${currentIndex}"]`
                          ) as HTMLElement | null
                        if (spanAtCurrentIndex) {
                          // Only clean up if this span is actually transparent (indicating it's the one for this barrel wheel)
                          const isTransparent =
                            spanAtCurrentIndex.style.color === "transparent" ||
                            spanAtCurrentIndex.style.color ===
                              "rgba(0, 0, 0, 0)" ||
                            window.getComputedStyle(spanAtCurrentIndex)
                              .color === "rgba(0, 0, 0, 0)"
                          if (isTransparent) {
                            removeTransparentColor(spanAtCurrentIndex)
                            spanAtCurrentIndex.removeAttribute("data-flow")
                            spanAtCurrentIndex.style.transition = "none"
                            cleanupWidthAnimation(spanAtCurrentIndex)
                          }
                        }
                      }

                      // Remove barrel wheel
                      wheel.remove()

                      // Final safety check: After removing barrel wheel, do one more pass to ensure
                      // the span at THIS index (not other spans with the same final digit) is not still transparent
                      // Use requestAnimationFrame to ensure DOM has updated
                      requestAnimationFrame(() => {
                        if (spanRef.current) {
                          const spanAtCurrentIndex =
                            spanRef.current.querySelector(
                              `[data-char-index="${currentIndex}"]`
                            ) as HTMLElement | null

                          if (spanAtCurrentIndex) {
                            const isTransparent =
                              spanAtCurrentIndex.style.color ===
                                "transparent" ||
                              spanAtCurrentIndex.style.color ===
                                "rgba(0, 0, 0, 0)" ||
                              window.getComputedStyle(spanAtCurrentIndex)
                                .color === "rgba(0, 0, 0, 0)"

                            // Check if there's still a barrel wheel for this specific index
                            const parentContainer =
                              spanRef.current.parentElement
                            const hasBarrelWheel =
                              parentContainer?.querySelector(
                                `[data-char-index="${currentIndex}"].${
                                  styles.barrel_wheel || ""
                                }`
                              )

                            // If no barrel wheel exists for THIS index and span is transparent, restore color
                            // Only check the span at currentIndex, not other spans with the same final digit
                            if (isTransparent && !hasBarrelWheel) {
                              removeTransparentColor(spanAtCurrentIndex)
                            }
                          }
                        }
                      })
                    },
                    { once: true }
                  )
                })
              })
            })
          })
        })

        // Set cursor - use span order to ensure correct positioning
        // Since each span contains exactly one character, we can use span index directly
        const setCursor = () => {
          if (!spanRef.current) return
          const selection = window.getSelection()
          if (!selection) return

          // Ensure cursor position is within bounds
          const targetPos = Math.min(newCursorPos, cleanedText.length)

          // Find the span at the target position
          const targetSpan = spanRef.current.querySelector(
            `[data-char-index="${targetPos}"]`
          )

          if (targetSpan) {
            // Cursor should be at the start of this span (before the character)
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

          // If targetPos is at the end, find the last span
          if (targetPos === cleanedText.length && cleanedText.length > 0) {
            const lastSpan = spanRef.current.querySelector(
              `[data-char-index="${cleanedText.length - 1}"]`
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

          // Fallback: use TreeWalker
          let currentPos = 0
          const walker = document.createTreeWalker(
            spanRef.current,
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

          // Ultimate fallback: cursor at end
          const range = document.createRange()
          range.selectNodeContents(spanRef.current)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
        }

        // Set cursor immediately after DOM updates, then again in next frame to catch any async changes
        setCursor()
        requestAnimationFrame(() => {
          setCursor()
        })
      }
    },
    [displayValue, onChange, autoAddLeadingZero]
  )

  // Initialize
  useEffect(() => {
    if (spanRef.current && displayValue) {
      spanRef.current.textContent = displayValue
    }
    // Initialize history with initial state
    if (historyRef.current.length === 0) {
      const initialValue = actualValue
      historyRef.current.push({
        text: displayValue,
        cursorPos: 0,
        value: initialValue,
      })
      historyIndexRef.current = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external changes
  useEffect(() => {
    // Only sync if the actualValue changed externally (not from our own updates)
    // We preserve trailing dots in displayValue, so we need to be careful here
    const newDisplay = actualValue?.toString() ?? ""
    // Parse current displayValue to see if it matches actualValue
    const currentParsed =
      displayValue === "" ||
      displayValue === "-" ||
      displayValue === "." ||
      displayValue === "-."
        ? undefined
        : parseFloat(displayValue)

    // Only update if actualValue is different from what we would parse from displayValue
    // This prevents syncing when we've intentionally preserved a trailing dot
    if (currentParsed !== actualValue) {
      setDisplayValue(newDisplay)
      if (spanRef.current) {
        // When syncing external changes (especially when actualValue becomes undefined),
        // we need to ensure the contentEditable matches the new display value exactly.
        // Only clear spans and barrel wheels if this is a significant change (e.g., actualValue became undefined)
        // to avoid interfering with normal DOM updates from user input
        if (actualValue === undefined && displayValue !== newDisplay) {
          const allSpans = spanRef.current.querySelectorAll("[data-char-index]")
          allSpans.forEach((span) => span.remove())
          // Also remove any barrel wheels
          const parentContainer = spanRef.current.parentElement
          if (parentContainer) {
            const barrelWheels = parentContainer.querySelectorAll(
              `[data-char-index].${styles.barrel_wheel || ""}`
            )
            barrelWheels.forEach((wheel) => wheel.remove())
          }
        }
        // Set textContent to new display value - this ensures contentEditable matches actualValue
        spanRef.current.textContent = newDisplay
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualValue, displayValue])

  // Cleanup ResizeObservers on unmount
  useEffect(() => {
    return () => {
      // Disconnect all ResizeObservers when component unmounts
      resizeObserversRef.current.forEach((observer) => {
        observer.disconnect()
      })
      resizeObserversRef.current.clear()
    }
  }, [])

  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLSpanElement>>(
    (event) => {
      const key = event.key

      // Get current state
      const currentText = displayValue
      const selection = window.getSelection()
      const range = selection?.getRangeAt(0)

      if (!range || !spanRef.current) return

      // Calculate cursor position
      const preRange = document.createRange()
      preRange.selectNodeContents(spanRef.current)
      preRange.setEnd(range.startContainer, range.startOffset)
      const start = preRange.toString().length

      preRange.setEnd(range.endContainer, range.endOffset)
      const end = preRange.toString().length

      // Handle special keys
      if ((event.metaKey || event.ctrlKey) && key === "Backspace") {
        event.preventDefault()
        // Remove barrel wheels for all indices being deleted (from 0 to end)
        const indicesToRemove: number[] = []
        for (let i = 0; i < end; i++) {
          indicesToRemove.push(i)
        }
        removeBarrelWheelsAtIndices(indicesToRemove)
        const newText = currentText.slice(end)
        updateValue(newText, 0, 0, end)
        return
      }

      if (event.metaKey || event.ctrlKey) {
        if (["b", "i", "u", "k"].includes(key.toLowerCase())) {
          event.preventDefault()
          return
        }
        // Handle Undo (Cmd+Z / Ctrl+Z)
        if (key.toLowerCase() === "z" && !event.shiftKey) {
          event.preventDefault()
          if (historyIndexRef.current > 0) {
            historyIndexRef.current--
            const historyItem = historyRef.current[historyIndexRef.current]
            if (historyItem) {
              isUndoRedoRef.current = true
              setDisplayValue(historyItem.text)
              setUncontrolledValue(historyItem.value)
              onChange?.(historyItem.value)
              setCursorPosition(historyItem.cursorPos)
              if (spanRef.current) {
                // Clear ALL child nodes (spans, text nodes, etc.) before setting textContent
                // This prevents duplicate content when barrel wheel animations are triggered after undo/redo
                while (spanRef.current.firstChild) {
                  spanRef.current.removeChild(spanRef.current.firstChild)
                }
                // Also remove any barrel wheels
                const parentContainer = spanRef.current.parentElement
                if (parentContainer) {
                  const barrelWheels = parentContainer.querySelectorAll(
                    `[data-char-index].${styles.barrel_wheel || ""}`
                  )
                  barrelWheels.forEach((wheel) => wheel.remove())
                }
                spanRef.current.textContent = historyItem.text
                // Set cursor position
                requestAnimationFrame(() => {
                  if (!spanRef.current) return
                  const selection = window.getSelection()
                  if (!selection) return
                  let currentPos = 0
                  const walker = document.createTreeWalker(
                    spanRef.current,
                    NodeFilter.SHOW_TEXT,
                    null
                  )
                  let node: Node | null
                  while ((node = walker.nextNode())) {
                    const nodeLength = node.textContent?.length ?? 0
                    if (currentPos + nodeLength >= historyItem.cursorPos) {
                      const offset = historyItem.cursorPos - currentPos
                      const range = document.createRange()
                      range.setStart(node, offset)
                      range.collapse(true)
                      selection.removeAllRanges()
                      selection.addRange(range)
                      isUndoRedoRef.current = false
                      return
                    }
                    currentPos += nodeLength
                  }
                  // Fallback
                  const range = document.createRange()
                  range.selectNodeContents(spanRef.current)
                  range.collapse(false)
                  selection.removeAllRanges()
                  selection.addRange(range)
                  isUndoRedoRef.current = false
                })
              }
            }
          }
          return
        }
        // Handle Redo (Cmd+Shift+Z / Ctrl+Y or Ctrl+Shift+Z)
        if (
          (key.toLowerCase() === "z" && event.shiftKey) ||
          key.toLowerCase() === "y"
        ) {
          event.preventDefault()
          if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current++
            const historyItem = historyRef.current[historyIndexRef.current]
            if (historyItem) {
              isUndoRedoRef.current = true
              setDisplayValue(historyItem.text)
              setUncontrolledValue(historyItem.value)
              onChange?.(historyItem.value)
              setCursorPosition(historyItem.cursorPos)
              if (spanRef.current) {
                // Clear ALL child nodes (spans, text nodes, etc.) before setting textContent
                // This prevents duplicate content when barrel wheel animations are triggered after undo/redo
                while (spanRef.current.firstChild) {
                  spanRef.current.removeChild(spanRef.current.firstChild)
                }
                // Also remove any barrel wheels
                const parentContainer = spanRef.current.parentElement
                if (parentContainer) {
                  const barrelWheels = parentContainer.querySelectorAll(
                    `[data-char-index].${styles.barrel_wheel || ""}`
                  )
                  barrelWheels.forEach((wheel) => wheel.remove())
                }
                spanRef.current.textContent = historyItem.text
                // Set cursor position
                requestAnimationFrame(() => {
                  if (!spanRef.current) return
                  const selection = window.getSelection()
                  if (!selection) return
                  let currentPos = 0
                  const walker = document.createTreeWalker(
                    spanRef.current,
                    NodeFilter.SHOW_TEXT,
                    null
                  )
                  let node: Node | null
                  while ((node = walker.nextNode())) {
                    const nodeLength = node.textContent?.length ?? 0
                    if (currentPos + nodeLength >= historyItem.cursorPos) {
                      const offset = historyItem.cursorPos - currentPos
                      const range = document.createRange()
                      range.setStart(node, offset)
                      range.collapse(true)
                      selection.removeAllRanges()
                      selection.addRange(range)
                      isUndoRedoRef.current = false
                      return
                    }
                    currentPos += nodeLength
                  }
                  // Fallback
                  const range = document.createRange()
                  range.selectNodeContents(spanRef.current)
                  range.collapse(false)
                  selection.removeAllRanges()
                  selection.addRange(range)
                  isUndoRedoRef.current = false
                })
              }
            }
          }
          return
        }
        // Handle Cut (Cmd+X / Ctrl+X)
        if (key.toLowerCase() === "x") {
          event.preventDefault()
          // Copy to clipboard (browser handles this automatically, but we need to handle the deletion)
          if (start !== end) {
            const selectedText = currentText.slice(start, end)
            // Try to copy to clipboard, but don't fail if clipboard API is not available (e.g., in tests)
            if (
              typeof navigator !== "undefined" &&
              navigator.clipboard &&
              navigator.clipboard.writeText
            ) {
              navigator.clipboard.writeText(selectedText).catch(() => {
                // Fallback if clipboard API fails
              })
            }
            // Delete the selected text
            const newText = currentText.slice(0, start) + currentText.slice(end)
            updateValue(newText, start, start, end)
          }
          return
        }
      }

      // Handle Alt/Cmd+ArrowLeft/ArrowRight (move to start/end)
      if (
        (event.metaKey || event.ctrlKey || event.altKey) &&
        (key === "ArrowLeft" || key === "ArrowRight")
      ) {
        event.preventDefault()

        if (!spanRef.current) return
        const selection = window.getSelection()
        if (!selection) return

        const targetPos = key === "ArrowLeft" ? 0 : currentText.length

        if (event.shiftKey) {
          // Extend selection to start/end
          // Use the selection's anchor point as the anchor
          let anchorPos = start
          if (
            selection.anchorNode &&
            spanRef.current.contains(selection.anchorNode)
          ) {
            const anchorRange = document.createRange()
            anchorRange.selectNodeContents(spanRef.current)
            anchorRange.setEnd(selection.anchorNode, selection.anchorOffset)
            anchorPos = anchorRange.toString().length
          }

          // Find both anchor and target nodes/offsets
          let currentPos = 0
          const walker = document.createTreeWalker(
            spanRef.current,
            NodeFilter.SHOW_TEXT,
            null
          )
          let anchorNode: Node | null = null
          let anchorOffset = 0
          let targetNode: Node | null = null
          let targetOffset = 0

          let node: Node | null
          while ((node = walker.nextNode())) {
            const nodeLength = node.textContent?.length ?? 0

            // Find anchor node (selection anchor position)
            if (!anchorNode && currentPos + nodeLength >= anchorPos) {
              anchorNode = node
              anchorOffset = anchorPos - currentPos
            }

            // Find target node
            if (!targetNode && currentPos + nodeLength >= targetPos) {
              targetNode = node
              targetOffset = targetPos - currentPos
            }

            if (anchorNode && targetNode) break

            currentPos += nodeLength
          }

          if (anchorNode && targetNode) {
            const range = document.createRange()

            // Set range from anchor to target (direction matters for selection direction)
            if (key === "ArrowLeft") {
              // Selecting backwards - anchor stays, extend to start
              range.setStart(targetNode, targetOffset)
              range.setEnd(anchorNode, anchorOffset)
            } else {
              // Selecting forwards - anchor stays, extend to end
              range.setStart(anchorNode, anchorOffset)
              range.setEnd(targetNode, targetOffset)
            }

            selection.removeAllRanges()
            selection.addRange(range)
          }
        } else {
          // Move cursor to start/end
          let currentPos = 0
          const walker = document.createTreeWalker(
            spanRef.current,
            NodeFilter.SHOW_TEXT,
            null
          )
          let node: Node | null

          while ((node = walker.nextNode())) {
            const nodeLength = node.textContent?.length ?? 0
            if (currentPos + nodeLength >= targetPos) {
              const offset = targetPos - currentPos
              const range = document.createRange()
              range.setStart(node, offset)
              range.collapse(true)
              selection.removeAllRanges()
              selection.addRange(range)
              return
            }
            currentPos += nodeLength
          }

          // Fallback
          const range = document.createRange()
          range.selectNodeContents(spanRef.current)
          range.collapse(key === "ArrowLeft")
          selection.removeAllRanges()
          selection.addRange(range)
        }
        return
      }

      const allowedKeys = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "Tab",
        "Home",
        "End",
      ]
      if (allowedKeys.includes(key)) {
        // Handle Backspace and Delete ourselves
        if (key === "Backspace") {
          event.preventDefault()
          if (start === end) {
            // No selection, delete character before cursor
            if (start > 0) {
              // Remove barrel wheel at the position being deleted
              removeBarrelWheelsAtIndices([start - 1])
              const newText =
                currentText.slice(0, start - 1) + currentText.slice(start)
              updateValue(newText, start - 1, start - 1, start)
            }
          } else {
            // Has selection, delete selected text
            // Remove barrel wheels for all indices in the selection range
            const indicesToRemove: number[] = []
            for (let i = start; i < end; i++) {
              indicesToRemove.push(i)
            }
            removeBarrelWheelsAtIndices(indicesToRemove)
            const newText = currentText.slice(0, start) + currentText.slice(end)
            updateValue(newText, start, start, end)
          }
          return
        }

        if (key === "Delete") {
          event.preventDefault()
          if (start === end) {
            // No selection
            if (event.metaKey || event.ctrlKey) {
              // Ctrl/Cmd+Delete: delete all characters after cursor
              if (start < currentText.length) {
                // Remove barrel wheels for all indices being deleted
                const indicesToRemove: number[] = []
                for (let i = start; i < currentText.length; i++) {
                  indicesToRemove.push(i)
                }
                removeBarrelWheelsAtIndices(indicesToRemove)
                const newText = currentText.slice(0, start)
                updateValue(newText, start, start, currentText.length)
              }
            } else {
              // Delete: delete one character after cursor
              if (start < currentText.length) {
                // Remove barrel wheel at the position being deleted
                removeBarrelWheelsAtIndices([start])
                const newText =
                  currentText.slice(0, start) + currentText.slice(start + 1)
                updateValue(newText, start, start, start + 1)
              }
            }
          } else {
            // Has selection, delete selected text
            // Remove barrel wheels for all indices in the selection range
            const indicesToRemove: number[] = []
            for (let i = start; i < end; i++) {
              indicesToRemove.push(i)
            }
            removeBarrelWheelsAtIndices(indicesToRemove)
            const newText = currentText.slice(0, start) + currentText.slice(end)
            updateValue(newText, start, start, end)
          }
          return
        }

        // Handle ArrowLeft and ArrowRight to move cursor by one character
        if (key === "ArrowLeft" || key === "ArrowRight") {
          event.preventDefault()
          if (!spanRef.current) return
          const selection = window.getSelection()
          if (!selection) return

          // Calculate target position
          let targetPos: number
          if (event.shiftKey) {
            // Extend selection
            // Helper function to get position from node and offset
            const getPositionFromNode = (
              node: Node | null,
              offset: number
            ): number => {
              if (!node || !spanRef.current?.contains(node)) {
                return start // Fallback to cursor position
              }
              const range = document.createRange()
              range.setStart(spanRef.current, 0)
              range.setEnd(node, offset)
              return range.toString().length
            }

            // Get anchor and focus positions from Selection API
            let anchorPos = getPositionFromNode(
              selection.anchorNode,
              selection.anchorOffset
            )
            let focusPos = getPositionFromNode(
              selection.focusNode,
              selection.focusOffset
            )

            // If there's no selection (anchor === focus), initialize both to cursor position
            // This happens when starting a new selection
            if (anchorPos === focusPos && start === end) {
              anchorPos = start
              focusPos = start
            }

            // Extend from focus position (the moving end of selection)
            // Anchor stays fixed, focus moves
            if (key === "ArrowLeft") {
              targetPos = Math.max(0, focusPos - 1)
            } else {
              targetPos = Math.min(currentText.length, focusPos + 1)
            }

            // Find both anchor and target nodes/offsets
            let currentPos = 0
            const walker = document.createTreeWalker(
              spanRef.current,
              NodeFilter.SHOW_TEXT,
              null
            )
            let anchorNode: Node | null = null
            let targetNode: Node | null = null
            let targetOffset = 0

            let node: Node | null
            while ((node = walker.nextNode())) {
              const nodeLength = node.textContent?.length ?? 0

              // Find anchor node
              if (!anchorNode && currentPos + nodeLength >= anchorPos) {
                anchorNode = node
                const _anchorOffset = anchorPos - currentPos
              }

              // Find target node
              if (!targetNode && currentPos + nodeLength >= targetPos) {
                targetNode = node
                targetOffset = targetPos - currentPos
              }

              if (anchorNode && targetNode) break

              currentPos += nodeLength
            }

            if (targetNode) {
              // Use Selection.extend() if available - it keeps anchor fixed and only moves focus
              // This is the proper way to extend selections
              try {
                selection.extend(targetNode, targetOffset)
              } catch {
                // extend() might not work in all cases, fall back to setting range
                // Find anchor node for range
                let anchorNode: Node | null = null
                let anchorOffset = 0
                let currentPos = 0
                const walker = document.createTreeWalker(
                  spanRef.current,
                  NodeFilter.SHOW_TEXT,
                  null
                )
                let node: Node | null
                while ((node = walker.nextNode())) {
                  const nodeLength = node.textContent?.length ?? 0
                  if (!anchorNode && currentPos + nodeLength >= anchorPos) {
                    anchorNode = node
                    anchorOffset = anchorPos - currentPos
                    break
                  }
                  currentPos += nodeLength
                }

                if (anchorNode) {
                  const range = document.createRange()
                  // Set range with anchor at start, new focus at end
                  range.setStart(anchorNode, anchorOffset)
                  range.setEnd(targetNode, targetOffset)
                  selection.removeAllRanges()
                  selection.addRange(range)
                }
              }
            }
          } else {
            // Move cursor
            // If there's a selection, move to start (ArrowLeft) or end (ArrowRight) of selection
            // Otherwise, move cursor by one character
            if (start !== end) {
              // There's a selection - move to start or end based on arrow direction
              if (key === "ArrowLeft") {
                targetPos = start
              } else {
                targetPos = end
              }
            } else {
              // No selection - move cursor by one character
              if (key === "ArrowLeft") {
                targetPos = Math.max(0, start - 1)
              } else {
                targetPos = Math.min(currentText.length, start + 1)
              }
            }

            // Find target node
            let currentPos = 0
            const walker = document.createTreeWalker(
              spanRef.current,
              NodeFilter.SHOW_TEXT,
              null
            )
            let node: Node | null

            while ((node = walker.nextNode())) {
              const nodeLength = node.textContent?.length ?? 0
              if (currentPos + nodeLength >= targetPos) {
                const offset = targetPos - currentPos
                const range = document.createRange()
                range.setStart(node, offset)
                range.collapse(true)
                selection.removeAllRanges()
                selection.addRange(range)
                return
              }
              currentPos += nodeLength
            }

            // Fallback
            const range = document.createRange()
            range.selectNodeContents(spanRef.current)
            range.collapse(key === "ArrowLeft")
            selection.removeAllRanges()
            selection.addRange(range)
          }
          return
        }

        // Allow other navigation keys
        return
      }

      if (event.ctrlKey || event.metaKey) {
        return
      }

      // Handle character input
      if (/^\d$/.test(key)) {
        // Prevent typing digit when cursor is at position 0 and text starts with "-"
        if (currentText.startsWith("-") && start === 0 && end === 0) {
          event.preventDefault()
          return
        }

        // Prevent adding 0 when there's already a leading 0 and cursor is before/after it
        // Also prevent adding 0 at the beginning of a number (would create leading zero)
        if (key === "0") {
          let shouldPrevent = false
          let restorePos = start

          // Check if text starts with "0" (including "0.")
          if (currentText.startsWith("0") && currentText.length > 0) {
            // Cursor is at position 0 (before the 0) - prevent typing another 0
            if (start === 0) {
              shouldPrevent = true
              restorePos = start
            }
            // Cursor is at position 1 (right after the 0) - prevent typing another 0
            // This applies even if followed by "." (e.g., "0.1121" should not become "00.1121")
            else if (start === 1 && end === 1) {
              shouldPrevent = true
              restorePos = start
            }
          }
          // Check if text starts with "-0" (including "-0.")
          else if (currentText.startsWith("-0") && currentText.length > 1) {
            // Cursor is at position 1 (right after "-") or 2 (right after "-0")
            // Prevent typing 0 at position 1 if we already have "-0" (whether followed by "." or not)
            if (start === 1) {
              shouldPrevent = true
              restorePos = start
            } else if (start === 2 && end === 2) {
              // Also prevent at position 2 (even if followed by ".")
              // This applies even if followed by "." (e.g., "-0.1121" should not become "-00.1121")
              shouldPrevent = true
              restorePos = start
            }
          }
          // Prevent adding 0 at the beginning of a number (would create leading zero like "012")
          // BUT allow it when text starts with "." (e.g., ".1121" -> "0.1121")
          else if (
            start === 0 &&
            currentText.length > 0 &&
            !currentText.startsWith("0") &&
            !currentText.startsWith("-") &&
            !currentText.startsWith(".")
          ) {
            // Typing 0 at position 0 of a number like "12" would create "012" which gets cleaned to "12"
            // So we should prevent it (unless text starts with ".")
            shouldPrevent = true
            restorePos = start
          }
          // Prevent adding 0 after minus in negative number (would create leading zero like "-012")
          // BUT allow it when the next character is "." (e.g., "-.1121" -> "-0.1121")
          else if (
            currentText.startsWith("-") &&
            start === 1 &&
            currentText.length > 1 &&
            currentText[1] !== "0" &&
            currentText[1] !== "."
          ) {
            // Typing 0 at position 1 after "-" in a number like "-12" would create "-012" which gets cleaned to "-12"
            // So we should prevent it (unless the next character is ".")
            shouldPrevent = true
            restorePos = start
          }

          if (shouldPrevent) {
            event.preventDefault()
            event.stopPropagation()
            // Mark that we should prevent the next input event
            shouldPreventInputRef.current = true
            preventInputCursorPosRef.current = restorePos

            // Restore cursor to original position - use both immediate and deferred restoration
            // to catch any browser default behavior
            if (spanRef.current) {
              const restoreCursor = () => {
                if (!spanRef.current) return
                const selection = window.getSelection()
                if (!selection) return

                let currentPos = 0
                const walker = document.createTreeWalker(
                  spanRef.current,
                  NodeFilter.SHOW_TEXT,
                  null
                )
                let node: Node | null

                while ((node = walker.nextNode())) {
                  const nodeLength = node.textContent?.length ?? 0
                  if (currentPos + nodeLength >= restorePos) {
                    const offset = Math.min(restorePos - currentPos, nodeLength)
                    const range = document.createRange()
                    range.setStart(node, offset)
                    range.collapse(true)
                    selection.removeAllRanges()
                    selection.addRange(range)
                    return
                  }
                  currentPos += nodeLength
                }

                // Fallback
                const range = document.createRange()
                range.selectNodeContents(spanRef.current)
                range.collapse(true)
                selection.removeAllRanges()
                selection.addRange(range)
              }

              // Try immediately
              restoreCursor()

              // Also try after a microtask to catch any delayed browser behavior
              Promise.resolve().then(restoreCursor)

              // And after a short timeout as a final safeguard
              setTimeout(restoreCursor, 0)
              requestAnimationFrame(restoreCursor)
            }
            return
          }
        }

        event.preventDefault()
        const newText =
          currentText.slice(0, start) + key + currentText.slice(end)
        updateValue(newText, start + 1, start, end)
        return
      }

      // Prevent default for other character inputs
      event.preventDefault()

      if (key === ".") {
        // Only allow one decimal point
        if (!currentText.includes(".")) {
          // Prevent typing "." when cursor is at position 0 and text starts with "-"
          if (currentText.startsWith("-") && start === 0 && end === 0) return
          const newText =
            currentText.slice(0, start) + key + currentText.slice(end)
          updateValue(newText, start + 1, start, end)
        }
        return
      }

      if (key === "-") {
        // Only allow minus at the beginning, and only if there isn't already one
        const hasMinus = currentText.startsWith("-")
        if (start === 0 && !hasMinus) {
          // Insert minus at the beginning (can replace selection)
          const newText = key + currentText.slice(end)
          updateValue(newText, start + 1, start, end)
        } else if (hasMinus && start === 0 && end === 0) {
          // Remove minus if cursor is at position 0 and minus exists (no selection)
          const newText = currentText.slice(1)
          updateValue(newText, 0, 0, 1)
        }
        // If hasMinus is true and start > 0, don't allow inserting minus in the middle
        return
      }
    },
    [displayValue, onChange, updateValue]
  )

  const handleCopy = useCallback<ClipboardEventHandler<HTMLSpanElement>>(
    (event) => {
      // Handle copy to ensure plain text without line breaks
      const selection = window.getSelection()
      const range = selection?.getRangeAt(0)
      if (!range || !spanRef.current) return

      const preRange = document.createRange()
      preRange.selectNodeContents(spanRef.current)
      preRange.setEnd(range.startContainer, range.startOffset)
      const start = preRange.toString().length

      preRange.setEnd(range.endContainer, range.endOffset)
      const end = preRange.toString().length

      if (start === end) return // No selection, nothing to copy

      const currentText = displayValue
      const selectedText = currentText.slice(start, end)

      // Copy plain text to clipboard (no HTML, no line breaks)
      event.clipboardData.setData("text/plain", selectedText)
      event.preventDefault() // Prevent default to avoid copying HTML
    },
    [displayValue]
  )

  const handleCut = useCallback<ClipboardEventHandler<HTMLSpanElement>>(
    (event) => {
      // Handle cut from context menu or other sources
      const selection = window.getSelection()
      const range = selection?.getRangeAt(0)
      if (!range || !spanRef.current) return

      const preRange = document.createRange()
      preRange.selectNodeContents(spanRef.current)
      preRange.setEnd(range.startContainer, range.startOffset)
      const start = preRange.toString().length

      preRange.setEnd(range.endContainer, range.endOffset)
      const end = preRange.toString().length

      if (start === end) return // No selection, nothing to cut

      const currentText = displayValue
      const selectedText = currentText.slice(start, end)

      // Copy to clipboard
      event.clipboardData.setData("text/plain", selectedText)

      // Delete the selected text
      const newText = currentText.slice(0, start) + currentText.slice(end)

      // Update value after cut
      // Use setTimeout to ensure the browser's default cut behavior completes first
      setTimeout(() => {
        updateValue(newText, start, start, end)
      }, 0)
    },
    [displayValue, updateValue]
  )

  const handleBeforeInput = useCallback<
    CompositionEventHandler<HTMLSpanElement>
  >((event) => {
    // Prevent input if we're blocking a leading 0
    if (shouldPreventInputRef.current) {
      event.preventDefault()
      const restorePos = preventInputCursorPosRef.current
      shouldPreventInputRef.current = false

      // Restore cursor position immediately and repeatedly
      const restoreCursor = () => {
        if (!spanRef.current) return
        const selection = window.getSelection()
        if (!selection) return

        let currentPos = 0
        const walker = document.createTreeWalker(
          spanRef.current,
          NodeFilter.SHOW_TEXT,
          null
        )
        let node: Node | null

        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (currentPos + nodeLength >= restorePos) {
            const offset = Math.min(restorePos - currentPos, nodeLength)
            const range = document.createRange()
            range.setStart(node, offset)
            range.collapse(true)
            selection.removeAllRanges()
            selection.addRange(range)
            return
          }
          currentPos += nodeLength
        }

        // Fallback
        const range = document.createRange()
        range.selectNodeContents(spanRef.current)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      }

      // Restore immediately
      restoreCursor()

      // Also restore after microtask and timeout to catch any delayed browser behavior
      Promise.resolve().then(restoreCursor)
      setTimeout(restoreCursor, 0)
      requestAnimationFrame(restoreCursor)
    }
  }, [])

  const handleInput = useCallback(() => {
    // Reset the prevent flag after input is processed
    if (shouldPreventInputRef.current) {
      shouldPreventInputRef.current = false
    }
  }, [])

  const handlePaste = useCallback<ClipboardEventHandler<HTMLSpanElement>>(
    (event) => {
      event.preventDefault()
      const pastedText = event.clipboardData.getData("text")

      if (!/^-?\d*\.?\d*$/.test(pastedText)) return

      const selection = window.getSelection()
      const range = selection?.getRangeAt(0)
      if (!range || !spanRef.current) return

      const preRange = document.createRange()
      preRange.selectNodeContents(spanRef.current)
      preRange.setEnd(range.startContainer, range.startOffset)
      const start = preRange.toString().length

      preRange.setEnd(range.endContainer, range.endOffset)
      const end = preRange.toString().length

      const currentText = displayValue
      const newText =
        currentText.slice(0, start) + pastedText + currentText.slice(end)

      // Validate the pasted text would result in a valid number format
      if (/^-?\d*\.?\d*$/.test(newText)) {
        updateValue(newText, start + pastedText.length, start, end)
      }
    },
    [displayValue, updateValue]
  )

  return (
    <>
      <span
        className={styles.number_flow_input_root}
        style={{
          border: "1px solid #ccc",
          fontSize: "2em",
          display: "inline-flex",
        }}
      >
        <span
          className={styles.number_flow_input_wrapper}
          style={{
            position: "relative",
            padding: "5px",
          }}
        >
          <span
            ref={spanRef}
            contentEditable
            suppressContentEditableWarning
            onKeyDown={handleKeyDown}
            onBeforeInput={handleBeforeInput}
            onInput={handleInput}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onCut={handleCut}
            className={styles.number_flow_input}
            style={{
              minWidth: "50px",
              padding: "0",
            }}
          />
          <input
            ref={inputRef}
            type="hidden"
            name={name}
            id={id}
            value={actualValue?.toString() ?? ""}
            readOnly
          />
        </span>
      </span>
      actual: <code>{actualValue}</code>
    </>
  )
}
