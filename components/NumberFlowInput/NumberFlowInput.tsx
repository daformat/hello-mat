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
  const [cursorPosition, setCursorPosition] = useState(0)

  // Undo/Redo history
  const historyRef = useRef<
    Array<{ text: string; cursorPos: number; value: MaybeUndefined<number> }>
  >([])
  const historyIndexRef = useRef(-1)
  const isUndoRedoRef = useRef(false)

  // Track if we should prevent the next input event (for leading 0 bug)
  const shouldPreventInputRef = useRef(false)
  const preventInputCursorPosRef = useRef(0)

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
      const hadLeadingZero =
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

        let html = ""
        for (let i = 0; i < cleanedText.length; i++) {
          const char = cleanedText[i]
          const isUnchanged = changes.unchangedIndices.has(i)
          const barrelWheel = changes.barrelWheelIndices.get(i)
          // If this character has a barrel wheel, don't add data-flow (it will be shown after animation)
          // Otherwise, add data-flow for normal animation
          const flowAttr = barrelWheel ? "" : 'data-flow=""'
          const showAttr = isUnchanged ? 'data-show=""' : ""
          // Always render the actual character in contentEditable (barrel wheel will overlay it)
          html += `<span ${flowAttr} data-char-index="${i}" ${showAttr}>${char}</span>`
        }

        spanRef.current.innerHTML = html

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
            const initialDigit = initialDigitStr
              ? parseInt(initialDigitStr, 10)
              : finalDigit

            // Determine old and new digits based on direction
            // When direction is "up": sequence = [old, ..., new] so initialDigitStr = old, finalDigitStr = new
            // When direction is "down": sequence = [new, ..., old] so initialDigitStr = new, finalDigitStr = old
            const oldDigitStr = direction === "up" ? initialDigitStr : finalDigitStr
            const newDigitStr = direction === "up" ? finalDigitStr : initialDigitStr

            // Find the span element at this index
            const charSpan = spanRef.current?.querySelector(
              `[data-char-index="${index}"]`
            )
            if (!charSpan || !(charSpan instanceof HTMLElement)) return

            // Get position of the character span relative to the parent container
            const parentContainer = spanRef.current?.parentElement
            if (!parentContainer) return

            // Measure the old digit's width (previous digit) - this will be the initial width
            let oldDigitWidth = 0
            if (oldDigitStr && charSpan) {
              const computedStyle = window.getComputedStyle(charSpan)
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
              tempMeasure.textContent = oldDigitStr
              document.body.appendChild(tempMeasure)
              oldDigitWidth = tempMeasure.getBoundingClientRect().width
              document.body.removeChild(tempMeasure)
            }

            // Measure the new digit's width (final digit) - this will be the destination width
            let newDigitWidth = 0
            if (newDigitStr && charSpan) {
              const computedStyle = window.getComputedStyle(charSpan)
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
              tempMeasure.textContent = newDigitStr
              document.body.appendChild(tempMeasure)
              newDigitWidth = tempMeasure.getBoundingClientRect().width
              document.body.removeChild(tempMeasure)
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

            // Create only the digits in the sequence (from old to new, inclusive)
            const sequence = barrelWheelData.sequence
            sequence.forEach((digitStr, index) => {
              const digit = document.createElement("div")
              digit.className = styles.barrel_digit || ""
              digit.setAttribute("data-digit", digitStr)
              digit.textContent = digitStr
              // digit.style.display = "block"
              digit.style.position = "relative"
              digit.style.height = "1em"
              digit.style.lineHeight = "1em"
              wrapper.appendChild(digit)
            })

            wheel.appendChild(wrapper)
            parentContainer.appendChild(wheel)

            // Position the barrel wheel over the character
            requestAnimationFrame(() => {
              // Set initial width of the new digit span to match old digit width (previous digit)
              // This will animate to the new digit's natural width (final digit)
              if (oldDigitWidth > 0 && newDigitWidth > 0) {
                charSpan.style.width = `${oldDigitWidth}px`
                charSpan.style.minWidth = `${oldDigitWidth}px`
                charSpan.style.maxWidth = `${oldDigitWidth}px`
                charSpan.setAttribute("data-width-animate", "")
              }

              const rect = charSpan.getBoundingClientRect()
              const parentRect = parentContainer.getBoundingClientRect()

              wheel.style.position = "absolute"
              wheel.style.left = `${rect.left - parentRect.left}px`
              wheel.style.top = `${rect.top - parentRect.top}px`
              wheel.style.width = `${rect.width}px`
              wheel.style.height = `${rect.height}px`
              wheel.style.display = "flex"
              wheel.style.alignItems =
                direction === "up" ? "flex-start" : "flex-end"

              // Hide the original character span (barrel wheel will show it)
              charSpan.style.color = "transparent"

              // The sequence contains digits from old to new (inclusive)
              // Position 0 = old digit (first in sequence)
              // Position sequence.length - 1 = new digit (last in sequence)
              const initialPosition = 0 // Start at first digit in sequence (old digit)
              const finalPosition = sequence.length - 1 // End at last digit in sequence (new digit)

              // Set initial position using CSS variable (no transition yet)
              // Position 0 means translateY(0) - showing the first digit (old digit)
              wrapper.style.setProperty(
                "--digit-position",
                initialPosition.toString()
              )

              // Force a reflow to ensure the initial state is rendered
              void wrapper.offsetHeight

              // Trigger animation from old digit to new digit
              // Use requestAnimationFrame to ensure initial state is painted
              requestAnimationFrame(() => {
                // Add animating class to enable transition
                wrapper.classList.add(styles.animating || "")

                // Force a reflow to ensure transition is applied
                void wrapper.offsetHeight

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
                    // Force a reflow to ensure initial width is set
                    void charSpan.offsetWidth
                    // Animate to new digit width (final digit)
                    requestAnimationFrame(() => {
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
                          // Remove width constraints after animation completes
                          charSpan.style.width = ""
                          charSpan.style.minWidth = ""
                          charSpan.style.maxWidth = ""
                          charSpan.removeAttribute("data-width-animate")
                          charSpan.removeEventListener(
                            "transitionend",
                            handleWidthAnimationEnd
                          )
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
                      // Remove barrel wheel first
                      wheel.remove()
                      // Then show the character immediately (no animation)
                      charSpan.style.color = ""
                      // Ensure the character doesn't have any animation attributes
                      if (charSpan instanceof HTMLElement) {
                        charSpan.removeAttribute("data-flow")
                        charSpan.style.transition = "none"
                      }
                    },
                    { once: true }
                  )
                })
              })
            })
          })
        })

        // Set cursor - use requestAnimationFrame to avoid flicker
        // Barrel wheels are outside contentEditable, so cursor positioning is simpler
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
            if (currentPos + nodeLength >= newCursorPos) {
              const offset = newCursorPos - currentPos
              const range = document.createRange()
              range.setStart(node, offset)
              range.collapse(true)
              selection.removeAllRanges()
              selection.addRange(range)
              return
            }
            currentPos += nodeLength
          }

          // Fallback: cursor at end
          const range = document.createRange()
          range.selectNodeContents(spanRef.current)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
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
        spanRef.current.textContent = newDisplay
      }
    }
  }, [actualValue])

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
              const newText =
                currentText.slice(0, start - 1) + currentText.slice(start)
              updateValue(newText, start - 1, start - 1, start)
            }
          } else {
            // Has selection, delete selected text
            const newText = currentText.slice(0, start) + currentText.slice(end)
            updateValue(newText, start, start, end)
          }
          return
        }

        if (key === "Delete") {
          event.preventDefault()
          if (start === end) {
            // No selection, delete character after cursor
            if (start < currentText.length) {
              const newText =
                currentText.slice(0, start) + currentText.slice(start + 1)
              updateValue(newText, start, start, start + 1)
            }
          } else {
            // Has selection, delete selected text
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
            let anchorOffset = 0
            let targetNode: Node | null = null
            let targetOffset = 0

            let node: Node | null
            while ((node = walker.nextNode())) {
              const nodeLength = node.textContent?.length ?? 0

              // Find anchor node
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

            if (targetNode) {
              // Use Selection.extend() if available - it keeps anchor fixed and only moves focus
              // This is the proper way to extend selections
              try {
                selection.extend(targetNode, targetOffset)
              } catch (e) {
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
            // Move cursor (no selection)
            if (key === "ArrowLeft") {
              targetPos = Math.max(0, start - 1)
            } else {
              targetPos = Math.min(currentText.length, start + 1)
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
