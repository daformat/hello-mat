import {
  ClipboardEventHandler,
  FormEventHandler,
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
}

export type NumberFlowInputProps = NumberFlowInputCommonProps &
  (NumberFlowInputControlledProps | NumberFlowInputUncontrolledProps)

// Convert DOM cursor position to logical character index
const getCursorLogicalPosition = (container: HTMLElement): number => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return 0

  const range = selection.getRangeAt(0)
  let position = 0

  // Walk through all child nodes until we find the cursor
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  )

  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node === range.startContainer) {
      position += range.startOffset
      break
    }
    position += node.textContent?.length ?? 0
  }

  return position
}

// Set cursor at logical character index
const setCursorLogicalPosition = (container: HTMLElement, position: number) => {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  )

  let currentPosition = 0
  let node: Node | null

  while ((node = walker.nextNode())) {
    const nodeLength = node.textContent?.length ?? 0

    if (currentPosition + nodeLength >= position) {
      // Cursor is in this text node
      const offset = position - currentPosition
      const range = document.createRange()
      const selection = window.getSelection()

      try {
        range.setStart(node, offset)
        range.collapse(true)
        selection?.removeAllRanges()
        selection?.addRange(range)
        return
      } catch {
        // If position is invalid, place at end
        break
      }
    }

    currentPosition += nodeLength
  }

  // Fallback: place cursor at end
  const range = document.createRange()
  const selection = window.getSelection()
  range.selectNodeContents(container)
  range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

const getComponents = (value: string) => {
  const sign = value.replaceAll(/[^+-]/g, "")
  const separator = value.replaceAll(/[^.]/g, "")
  const [digits = "", decimals = ""] = value.replace(sign, "").split(".")

  return {
    sign,
    separator,
    digits: digits.split(""),
    decimals: decimals.split(""),
  }
}

const wrapFirstLevelChars = (container: HTMLElement) => {
  // Get only direct child nodes (not nested)
  const childNodes = Array.from(container.childNodes)

  childNodes.forEach((node) => {
    // Only process text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ""

      // Split into characters and wrap each digit
      const fragment = document.createDocumentFragment()
      for (const char of text) {
        // Wrap digit in span
        const span = document.createElement("span")
        span.dataset.flow = ""
        span.textContent = char
        fragment.appendChild(span)
      }

      // Replace the text node with the fragment
      node.parentNode?.replaceChild(fragment, node)
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node.textContent?.length ?? 0) > 1
    ) {
      wrapFirstLevelChars(node as HTMLElement)
      const fragment = document.createDocumentFragment()
      fragment.append(...node.childNodes)
      node.parentNode?.replaceChild(fragment, node)
    }
  })
}

interface Changes {
  addedIndices: Set<number>
  removedIndices: Set<number>
  unchangedIndices: Set<number>
}

interface Changes {
  addedIndices: Set<number>
  removedIndices: Set<number>
  unchangedIndices: Set<number>
  changedIndices: Set<number> // Indices in newValue where character was replaced
}

const getStringChanges = (
  oldValue: string,
  newValue: string,
  cursorPosition?: number
): Changes => {
  const changes: Changes = {
    addedIndices: new Set(),
    removedIndices: new Set(),
    unchangedIndices: new Set(),
    changedIndices: new Set(),
  }

  // Handle empty cases
  if (!oldValue && !newValue) {
    return changes
  }

  if (!oldValue) {
    for (let i = 0; i < newValue.length; i++) {
      changes.addedIndices.add(i)
    }
    return changes
  }

  if (!newValue) {
    for (let i = 0; i < oldValue.length; i++) {
      changes.removedIndices.add(i)
    }
    return changes
  }

  const oldLen = oldValue.length
  const newLen = newValue.length
  const lengthDiff = newLen - oldLen

  // If we have cursor position, use it to guide the comparison
  if (cursorPosition !== undefined) {
    if (lengthDiff > 0) {
      // Characters were added
      const changeStartPos = cursorPosition - lengthDiff
      const changeEndPos = cursorPosition

      // Mark unchanged before the change
      for (let i = 0; i < changeStartPos; i++) {
        if (oldValue[i] === newValue[i]) {
          changes.unchangedIndices.add(i)
        }
      }

      // Mark added characters
      for (let i = changeStartPos; i < changeEndPos; i++) {
        changes.addedIndices.add(i)
      }

      // Mark unchanged after the change
      for (let i = changeEndPos; i < newLen; i++) {
        const oldIndex = i - lengthDiff
        if (
          oldIndex >= 0 &&
          oldIndex < oldLen &&
          oldValue[oldIndex] === newValue[i]
        ) {
          changes.unchangedIndices.add(i)
        }
      }
    } else if (lengthDiff < 0) {
      // Characters were removed
      const changeStartPos = cursorPosition

      // Mark unchanged before the change
      for (let i = 0; i < changeStartPos; i++) {
        changes.unchangedIndices.add(i)
      }

      // Mark removed characters (in old string)
      for (let i = changeStartPos; i < changeStartPos - lengthDiff; i++) {
        changes.removedIndices.add(i)
      }

      // Mark unchanged after the change
      for (let i = changeStartPos; i < newLen; i++) {
        const oldIndex = i - lengthDiff
        if (oldIndex >= 0 && oldIndex < oldLen) {
          changes.unchangedIndices.add(i)
        }
      }
    } else {
      // Same length - could be replacements or unchanged
      for (let i = 0; i < newLen; i++) {
        if (oldValue[i] === newValue[i]) {
          changes.unchangedIndices.add(i)
        } else {
          changes.changedIndices.add(i)
        }
      }
    }

    return changes
  }

  // Fallback to prefix/suffix algorithm when no cursor position
  let prefixLen = 0
  const minLen = Math.min(oldLen, newLen)
  while (prefixLen < minLen && oldValue[prefixLen] === newValue[prefixLen]) {
    prefixLen++
  }

  let suffixLen = 0
  while (
    suffixLen < minLen - prefixLen &&
    oldValue[oldLen - 1 - suffixLen] === newValue[newLen - 1 - suffixLen]
  ) {
    suffixLen++
  }

  // Mark unchanged in prefix
  for (let i = 0; i < prefixLen; i++) {
    changes.unchangedIndices.add(i)
  }

  // Mark unchanged in suffix
  for (let i = 0; i < suffixLen; i++) {
    changes.unchangedIndices.add(newLen - 1 - i)
  }

  const oldMiddleStart = prefixLen
  const oldMiddleEnd = oldLen - suffixLen
  const newMiddleStart = prefixLen
  const newMiddleEnd = newLen - suffixLen

  const oldMiddleLen = oldMiddleEnd - oldMiddleStart
  const newMiddleLen = newMiddleEnd - newMiddleStart

  if (oldMiddleLen === newMiddleLen && oldMiddleLen > 0) {
    // Same length middle section - could be replacements
    for (let i = 0; i < oldMiddleLen; i++) {
      const oldIndex = oldMiddleStart + i
      const newIndex = newMiddleStart + i
      if (oldValue[oldIndex] !== newValue[newIndex]) {
        changes.changedIndices.add(newIndex)
      } else {
        changes.unchangedIndices.add(newIndex)
      }
    }
  } else {
    // Different lengths - mark as additions/removals
    for (let i = newMiddleStart; i < newMiddleEnd; i++) {
      changes.addedIndices.add(i)
    }

    for (let i = oldMiddleStart; i < oldMiddleEnd; i++) {
      changes.removedIndices.add(i)
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
}: NumberFlowInputProps) => {
  const spanRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isUserInputRef = useRef(false)
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const isControlled = value !== undefined
  const actualValue = isControlled ? value : uncontrolledValue
  const lastValueRef = useRef<string>(actualValue?.toString() ?? "")

  const updateDOM = useCallback((newValue: string) => {
    if (!spanRef.current) {
      return
    }

    // Save cursor position BEFORE updating
    const cursorPosition = getCursorLogicalPosition(spanRef.current)
    const oldValue = lastValueRef.current // Get old value before updating

    if (!newValue) {
      spanRef.current.innerHTML = ""
      lastValueRef.current = newValue
      return
    }

    // Find what changed between old and new
    const changes = getStringChanges(oldValue, newValue, cursorPosition)

    // First, wrap all characters
    wrapFirstLevelChars(spanRef.current)
    const flowElements = Array.from(
      spanRef.current?.querySelectorAll("[data-flow]")
    )
    changes.unchangedIndices.forEach((index) => {
      const element = flowElements[index]
      if (element instanceof HTMLElement) {
        element.dataset.show = ""
      }
    })

    // Then mark only the NEW characters with data-show
    setTimeout(() => {
      const flowElements = spanRef.current?.querySelectorAll("[data-flow]")
      if (!flowElements) return

      Array.from(flowElements).forEach((element, index) => {
        if (element instanceof HTMLElement && changes.addedIndices.has(index)) {
          element.dataset.show = ""
        }
      })
    })

    // Restore cursor position AFTER updating
    setCursorLogicalPosition(spanRef.current, cursorPosition)

    lastValueRef.current = newValue
  }, [])

  const updateValue = useCallback(
    (value: string) => {
      isUserInputRef.current = true

      // Handle empty or invalid intermediate states
      if (value === "" || value === "-" || value === "." || value === "-.") {
        onChange?.(undefined)
        setUncontrolledValue(undefined)
        updateDOM(value) // <-- Keep the intermediate value, don't clear it!
        return
      }

      const numberValue = parseFloat(value)
      const finalValue = isNaN(numberValue) ? undefined : numberValue

      onChange?.(finalValue)
      setUncontrolledValue(finalValue)
      updateDOM(value)
    },
    [onChange, updateDOM]
  )

  // Set initial value
  useEffect(() => {
    if (spanRef.current && spanRef.current.textContent === "") {
      spanRef.current.textContent = actualValue?.toString() ?? ""
    }
    // We don't want to run this effect when actualValue changes, only on initial render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync hidden input value whenever actualValue changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = actualValue?.toString() ?? ""
    }
  }, [actualValue])

  // Sync the display value only when controlled value changes externally (not from user input)
  useEffect(() => {
    if (!spanRef.current) return

    // Skip update if this change came from user input
    if (isUserInputRef.current) {
      isUserInputRef.current = false
      return
    }

    const displayValue = actualValue?.toString() ?? ""

    // Only update if the content is different to avoid cursor issues
    if (spanRef.current.textContent !== displayValue) {
      // Save cursor position before update
      const selection = window.getSelection()
      let cursorPosition = 0

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        cursorPosition = range.startOffset
      }

      // Update content
      spanRef.current.textContent = displayValue

      // Restore cursor position
      if (spanRef.current.firstChild) {
        const newRange = document.createRange()
        const newSelection = window.getSelection()

        // Clamp cursor position to the new content length
        const maxPosition = spanRef.current.textContent?.length ?? 0
        const restoredPosition = Math.min(cursorPosition, maxPosition)

        try {
          newRange.setStart(spanRef.current.firstChild, restoredPosition)
          newRange.collapse(true)
          newSelection?.removeAllRanges()
          newSelection?.addRange(newRange)
        } catch {
          // If setting the position fails, just place cursor at the end
          newRange.selectNodeContents(spanRef.current)
          newRange.collapse(false)
          newSelection?.removeAllRanges()
          newSelection?.addRange(newRange)
        }
      }
    }
  }, [actualValue])

  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLSpanElement>>(
    (event) => {
      const key = event.key
      const currentText = event.currentTarget.textContent ?? ""

      // Handle Cmd/Ctrl + Backspace - delete everything before cursor
      if ((event.metaKey || event.ctrlKey) && key === "Backspace") {
        event.preventDefault()

        if (!spanRef.current) return

        const cursorPosition = getCursorLogicalPosition(spanRef.current)

        // Delete everything before cursor
        const newText = currentText.slice(cursorPosition)
        spanRef.current.textContent = newText

        // Place cursor at the beginning
        setCursorLogicalPosition(spanRef.current, 0)

        // Update the value
        updateValue(newText)
        return
      }

      // Prevent formatting shortcuts (Cmd/Ctrl + B, I, U, K)
      if (event.metaKey || event.ctrlKey) {
        const formattingKeys = ["b", "i", "u", "k"]
        if (formattingKeys.includes(key.toLowerCase())) {
          event.preventDefault()
          return
        }
      }

      // Handle word/line navigation shortcuts
      if (
        (event.metaKey || event.ctrlKey || event.altKey) &&
        (key === "ArrowLeft" || key === "ArrowRight")
      ) {
        event.preventDefault()

        if (!spanRef.current) return

        // Cmd/Ctrl + Arrow or Alt + Arrow should move to start/end
        const targetPosition = key === "ArrowLeft" ? 0 : currentText.length

        setCursorLogicalPosition(spanRef.current, targetPosition)
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

      // Allow control keys
      if (allowedKeys.includes(key) || event.ctrlKey || event.metaKey) {
        return
      }

      // Get cursor position
      const selection = window.getSelection()
      const cursorPosition = selection?.anchorOffset ?? 0

      // Allow digits only if not before a minus sign
      if (/^\d$/.test(key)) {
        // Don't allow digits before a minus sign
        if (currentText.startsWith("-") && cursorPosition === 0) {
          event.preventDefault()
          return
        }
        return // ALLOW the digit
      }

      // Allow decimal point only if there isn't one already and not before a minus sign
      if (key === ".") {
        if (!currentText.includes(".")) {
          // Don't allow decimal point before a minus sign
          if (currentText.startsWith("-") && cursorPosition === 0) {
            event.preventDefault()
            return
          }
          return // ALLOW the decimal
        }
        event.preventDefault() // BLOCK - already has decimal
        return
      }

      // Allow minus at the start or when cursor is at position 0 and there's no minus already
      if (key === "-") {
        const hasMinus = currentText.startsWith("-")

        // Allow if empty, cursor at start and no minus, or replacing a selection at start
        if (currentText.length === 0 || (cursorPosition === 0 && !hasMinus)) {
          return // ALLOW the minus
        }
        event.preventDefault() // BLOCK - not at start or already has minus
        return
      }

      // Block everything else
      event.preventDefault()
    },
    [updateValue]
  )

  const handlePaste = useCallback<ClipboardEventHandler<HTMLSpanElement>>(
    (event) => {
      event.preventDefault()
      const pastedText = event.clipboardData.getData("text")

      // Check if pasted text is a valid float pattern
      if (!/^-?\d*\.?\d*$/.test(pastedText)) {
        return
      }

      // Get current selection
      const selection = window.getSelection()
      if (!selection || !spanRef.current) return

      const range = selection.getRangeAt(0)
      const currentText = spanRef.current.textContent ?? ""

      // Calculate what the text would be after paste
      const startOffset = range.startOffset
      const endOffset = range.endOffset
      const beforeSelection = currentText.substring(0, startOffset)
      const afterSelection = currentText.substring(endOffset)
      const resultText = beforeSelection + pastedText + afterSelection

      // Validate the result would be a valid float pattern
      if (/^-?\d*\.?\d*$/.test(resultText)) {
        document.execCommand("insertText", false, pastedText)
      }
    },
    []
  )

  const handleInput = useCallback<FormEventHandler<HTMLSpanElement>>(
    (event) => {
      if (!spanRef.current) return

      const textContent = event.currentTarget.textContent ?? ""

      // Remove any invalid characters that slip through
      const cleanedText = textContent.replace(/[^\d.-]/g, "")

      // If the text was cleaned (had invalid characters), update the contentEditable
      if (cleanedText !== textContent) {
        const selection = window.getSelection()
        const cursorPosition = selection?.anchorOffset ?? 0

        spanRef.current.textContent = cleanedText

        // Restore cursor position
        if (spanRef.current.firstChild) {
          const newRange = document.createRange()
          const newSelection = window.getSelection()
          const maxPosition = cleanedText.length
          const restoredPosition = Math.min(
            cursorPosition - (textContent.length - cleanedText.length),
            maxPosition
          )

          try {
            newRange.setStart(
              spanRef.current.firstChild,
              Math.max(0, restoredPosition)
            )
            newRange.collapse(true)
            newSelection?.removeAllRanges()
            newSelection?.addRange(newRange)
          } catch {
            // If setting the position fails, just place cursor at the end
            newRange.selectNodeContents(spanRef.current)
            newRange.collapse(false)
            newSelection?.removeAllRanges()
            newSelection?.addRange(newRange)
          }
        }
      }

      // Always update the value
      updateValue(cleanedText)
    },
    [updateValue]
  )

  return (
    <>
      <span
        style={{
          border: "1px solid #ccc",
          display: "inline-block",
          fontSize: "2em",
        }}
      >
        <span
          ref={spanRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={styles.number_flow_input}
          style={{ padding: "5px", minWidth: "50px", display: "inline-block" }}
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
      actual: <code>{actualValue}</code>
    </>
  )
}
