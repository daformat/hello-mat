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

    // Mark unchanged before replacement
    for (let i = 0; i < insertStart; i++) {
      if (i < oldValue.length && i < newValue.length && oldValue[i] === newValue[i]) {
        changes.unchangedIndices.add(i)
      }
    }

    // Mark all inserted characters as added
    for (let i = insertStart; i < newCursorPos; i++) {
      changes.addedIndices.add(i)
    }

    // Mark unchanged after replacement
    // Need to account for the length difference
    const oldAfterEnd = selectionEnd
    const newAfterEnd = newCursorPos
    const minLength = Math.min(oldValue.length - oldAfterEnd, newValue.length - newAfterEnd)
    
    for (let i = 0; i < minLength; i++) {
      const oldIdx = oldAfterEnd + i
      const newIdx = newAfterEnd + i
      if (oldIdx < oldValue.length && newIdx < newValue.length && oldValue[oldIdx] === newValue[newIdx]) {
        changes.unchangedIndices.add(newIdx)
      }
    }
  } else if (lengthDiff > 0) {
    // Addition without selection
    const insertPos = newCursorPos - lengthDiff

    // Mark unchanged before insertion
    for (let i = 0; i < insertPos; i++) {
      if (i < oldValue.length && i < newValue.length && oldValue[i] === newValue[i]) {
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
      if (oldIdx >= 0 && oldIdx < oldValue.length && oldValue[oldIdx] === newValue[i]) {
        changes.unchangedIndices.add(i)
      }
    }
  } else if (lengthDiff < 0) {
    // Deletion
    const deletePos = selectionStart
    const numDeleted = -lengthDiff

    // Mark unchanged before deletion
    for (let i = 0; i < deletePos; i++) {
      if (i < oldValue.length && i < newValue.length && oldValue[i] === newValue[i]) {
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
  const [displayValue, setDisplayValue] = useState(actualValue?.toString() ?? "")
  const [cursorPosition, setCursorPosition] = useState(0)
  
  // Undo/Redo history
  const historyRef = useRef<Array<{ text: string; cursorPos: number; value: MaybeUndefined<number> }>>([])
  const historyIndexRef = useRef(-1)
  const isUndoRedoRef = useRef(false)
  
  // Track if we should prevent the next input event (for leading 0 bug)
  const shouldPreventInputRef = useRef(false)
  const preventInputCursorPosRef = useRef(0)

  const updateValue = useCallback(
    (newText: string, newCursorPos: number, selectionStart: number, selectionEnd: number, skipHistory = false) => {
      const oldText = displayValue

      // Validate and clean
      let cleanedText = newText.replace(/[^\d.-]/g, "")
      
      // Track if we're removing leading zeros (for animation fix)
      const hadLeadingZero = cleanedText.startsWith("0") && cleanedText.length > 1 && cleanedText[1] !== "."

      // Ensure only one minus sign at the beginning
      const minusCount = (cleanedText.match(/-/g) || []).length
      if (minusCount > 1) {
        // Keep only the first minus
        cleanedText = cleanedText.replace(/-/g, (match, offset) => (offset === 0 ? match : ""))
      }
      // Remove minus if it's not at the beginning
      if (cleanedText.includes("-") && !cleanedText.startsWith("-")) {
        cleanedText = cleanedText.replace(/-/g, "")
      }

      // Ensure only one decimal point
      const dotCount = (cleanedText.match(/\./g) || []).length
      if (dotCount > 1) {
        // Keep only the first dot
        let firstDotIndex = cleanedText.indexOf(".")
        cleanedText = cleanedText.slice(0, firstDotIndex + 1) + cleanedText.slice(firstDotIndex + 1).replace(/\./g, "")
      }

      // Remove leading zeros (except for "0" itself or "0.")
      // Match patterns like "000123" -> "123" or "000.5" -> "0.5"
      let leadingZerosRemoved = 0
      if (cleanedText.length > 1 && cleanedText[0] === '0' && cleanedText[1] !== '.') {
        // Count how many leading zeros we'll remove
        const match = cleanedText.match(/^0+/)
        leadingZerosRemoved = match ? match[0].length - 1 : 0
        // Remove leading zeros
        cleanedText = cleanedText.replace(/^0+/, '')
        // If we removed everything, keep one zero
        if (cleanedText === '' || cleanedText.startsWith('.') || cleanedText.startsWith('-')) {
          cleanedText = '0' + cleanedText
          leadingZerosRemoved = 0
        }
        // Adjust cursor position if we removed leading zeros
        if (leadingZerosRemoved > 0 && newCursorPos > 0) {
          newCursorPos = Math.max(0, newCursorPos - leadingZerosRemoved)
        }
      }

      // Handle negative numbers with leading zeros
      if (cleanedText.startsWith('-') && cleanedText.length > 2) {
        const afterMinus = cleanedText.slice(1)
        if (afterMinus[0] === '0' && afterMinus[1] !== '.') {
          const cleaned = afterMinus.replace(/^0+/, '')
          cleanedText = '-' + (cleaned === '' || cleaned.startsWith('.') ? '0' + cleaned : cleaned)
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
      if (cleanedText === "" || cleanedText === "-" || cleanedText === "." || cleanedText === "-.") {
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
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
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
          if (oldText.startsWith("0") && oldText.length > 1 && oldText[1] !== ".") {
            // More general case: if oldText was "0123" and we typed "4" to get "01234" which became "1234",
            // we need to adjust the comparison
            const oldWithoutLeadingZeros = oldText.replace(/^0+/, "")
            if (oldWithoutLeadingZeros === cleanedText.slice(0, oldWithoutLeadingZeros.length)) {
              // The old text (without leading zeros) matches the start of new text
              // This means we just added characters at the end
              adjustedOldText = oldWithoutLeadingZeros
              // Adjust selection and cursor positions to account for removed leading zeros
              adjustedSelectionStart = Math.max(0, selectionStart - leadingZerosRemoved)
              adjustedSelectionEnd = Math.max(0, selectionEnd - leadingZerosRemoved)
              adjustedNewCursorPos = Math.max(0, newCursorPos - leadingZerosRemoved)
            }
          }
        }
        const changes = getChanges(adjustedOldText, cleanedText, adjustedSelectionStart, adjustedSelectionEnd, adjustedNewCursorPos)

        let html = ""
        for (let i = 0; i < cleanedText.length; i++) {
          const char = cleanedText[i]
          const isUnchanged = changes.unchangedIndices.has(i)
          const showAttr = isUnchanged ? 'data-show=""' : ''
          html += `<span data-flow="" ${showAttr}>${char}</span>`
        }

        spanRef.current.innerHTML = html

        // Animate new characters
        setTimeout(() => {
          const flowElements = spanRef.current?.querySelectorAll("[data-flow]")
          if (!flowElements) return

          Array.from(flowElements).forEach((element, index) => {
            if (element instanceof HTMLElement && changes.addedIndices.has(index)) {
              element.dataset.show = ""
            }
          })
        }, 10)

        // Set cursor - use requestAnimationFrame to avoid flicker
        requestAnimationFrame(() => {
          if (!spanRef.current) return
          const selection = window.getSelection()
          if (!selection) return

          let currentPos = 0
          const walker = document.createTreeWalker(spanRef.current, NodeFilter.SHOW_TEXT, null)
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
    const currentParsed = displayValue === "" || displayValue === "-" || displayValue === "." || displayValue === "-."
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
                  const walker = document.createTreeWalker(spanRef.current, NodeFilter.SHOW_TEXT, null)
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
        if ((key.toLowerCase() === "z" && event.shiftKey) || key.toLowerCase() === "y") {
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
                  const walker = document.createTreeWalker(spanRef.current, NodeFilter.SHOW_TEXT, null)
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
            if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
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
      if ((event.metaKey || event.ctrlKey || event.altKey) && (key === "ArrowLeft" || key === "ArrowRight")) {
        event.preventDefault()

        if (!spanRef.current) return
        const selection = window.getSelection()
        if (!selection) return

        const targetPos = key === "ArrowLeft" ? 0 : currentText.length

        if (event.shiftKey) {
          // Extend selection to start/end
          // Use the selection's anchor point as the anchor
          let anchorPos = start
          if (selection.anchorNode && spanRef.current.contains(selection.anchorNode)) {
            const anchorRange = document.createRange()
            anchorRange.selectNodeContents(spanRef.current)
            anchorRange.setEnd(selection.anchorNode, selection.anchorOffset)
            anchorPos = anchorRange.toString().length
          }

          // Find both anchor and target nodes/offsets
          let currentPos = 0
          const walker = document.createTreeWalker(spanRef.current, NodeFilter.SHOW_TEXT, null)
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
          const walker = document.createTreeWalker(spanRef.current, NodeFilter.SHOW_TEXT, null)
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

      const allowedKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"]
      if (allowedKeys.includes(key)) {
        // Handle Backspace and Delete ourselves
        if (key === "Backspace") {
          event.preventDefault()
          if (start === end) {
            // No selection, delete character before cursor
            if (start > 0) {
              const newText = currentText.slice(0, start - 1) + currentText.slice(start)
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
              const newText = currentText.slice(0, start) + currentText.slice(start + 1)
              updateValue(newText, start, start, start + 1)
            }
          } else {
            // Has selection, delete selected text
            const newText = currentText.slice(0, start) + currentText.slice(end)
            updateValue(newText, start, start, end)
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
          else if (start === 0 && currentText.length > 0 && !currentText.startsWith("0") && !currentText.startsWith("-") && !currentText.startsWith(".")) {
            // Typing 0 at position 0 of a number like "12" would create "012" which gets cleaned to "12"
            // So we should prevent it (unless text starts with ".")
            shouldPrevent = true
            restorePos = start
          }
          // Prevent adding 0 after minus in negative number (would create leading zero like "-012")
          // BUT allow it when the next character is "." (e.g., "-.1121" -> "-0.1121")
          else if (currentText.startsWith("-") && start === 1 && currentText.length > 1 && currentText[1] !== "0" && currentText[1] !== ".") {
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
                const walker = document.createTreeWalker(spanRef.current, NodeFilter.SHOW_TEXT, null)
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
        const newText = currentText.slice(0, start) + key + currentText.slice(end)
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
          const newText = currentText.slice(0, start) + key + currentText.slice(end)
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
    [displayValue, updateValue]
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

  const handleBeforeInput = useCallback<CompositionEventHandler<HTMLSpanElement>>(
    (event) => {
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
          const walker = document.createTreeWalker(spanRef.current, NodeFilter.SHOW_TEXT, null)
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
    },
    []
  )

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
      const newText = currentText.slice(0, start) + pastedText + currentText.slice(end)

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
        style={{
          border: "1px solid #ccc",
          display: "inline-block",
          fontSize: "2em",
        }}
      >
        <span
          ref={spanRef}
          contentEditable
          suppressContentEditableWarning
          onKeyDown={handleKeyDown}
          onBeforeInput={handleBeforeInput}
          onInput={handleInput}
          onPaste={handlePaste}
          onCut={handleCut}
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
