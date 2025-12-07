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

  const updateValue = useCallback(
    (value: string) => {
      isUserInputRef.current = true

      // Allow intermediate states like "-" or "1." while typing
      if (value === "" || value === "-" || value === "." || value === "-.") {
        // Don't update the parent with these intermediate values
        return
      }

      const numberValue = parseFloat(value)
      const finalValue = isNaN(numberValue) ? undefined : numberValue

      onChange?.(finalValue)
      setUncontrolledValue(finalValue)
    },
    [onChange]
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

      // Prevent formatting shortcuts (Cmd/Ctrl + B, I, U, K)
      if (event.metaKey || event.ctrlKey) {
        const formattingKeys = ["b", "i", "u", "k"]
        if (formattingKeys.includes(key.toLowerCase())) {
          event.preventDefault()
          return
        }
        // Allow all other Ctrl/Cmd shortcuts (including A, C, V, X, Z, Y for copy/paste/undo/redo)
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
        return
      }

      // Allow decimal point only if there isn't one already and not before a minus sign
      if (key === "." && !currentText.includes(".")) {
        // Don't allow decimal point before a minus sign
        if (currentText.startsWith("-") && cursorPosition === 0) {
          event.preventDefault()
          return
        }
        return
      }

      // Allow minus at the start or when cursor is at position 0 and there's no minus already
      if (key === "-") {
        const hasMinus = currentText.startsWith("-")

        // Allow if empty, cursor at start and no minus, or replacing a selection at start
        if (currentText.length === 0 || (cursorPosition === 0 && !hasMinus)) {
          return
        }
      }
      event.preventDefault()
    },
    []
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
        // Use execCommand to insert at cursor position
        document.execCommand("insertText", false, pastedText)
      }
    },
    []
  )

  const handleInput = useCallback<FormEventHandler<HTMLSpanElement>>(
    (event) => {
      const { textContent } = event.currentTarget
      updateValue(textContent ?? "")
    },
    [updateValue]
  )

  return (
    <>
      <span
        ref={spanRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        suppressContentEditableWarning
        style={{
          border: "1px solid #ccc",
          padding: "5px",
          minWidth: "50px",
          display: "inline-block",
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
      actual: <code>{actualValue}</code>
    </>
  )
}
