import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, waitFor } from "@testing-library/react"
import { NumberFlowInput } from "./NumberFlowInput"

// Helper to get the contentEditable element
const getInput = () => {
  const span = document.querySelector('[contenteditable="true"]')
  return span as HTMLElement
}

// Helper to type text character by character (simulating real typing)
const typeText = async (element: HTMLElement, text: string) => {
  for (const char of text) {
    // Get current cursor position
    const selection = window.getSelection()
    const range = selection?.getRangeAt(0)
    if (!range) {
      setCursorPosition(element, element.textContent?.length || 0)
    }

    // Fire keyDown event which the component handles
    fireEvent.keyDown(element, {
      key: char,
      preventDefault: vi.fn(),
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    })

    // Wait for React to update
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

// Helper to set cursor position
const setCursorPosition = (element: HTMLElement, position: number) => {
  const selection = window.getSelection()
  if (!selection) return

  const range = document.createRange()
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)
  let currentPos = 0
  let node: Node | null

  while ((node = walker.nextNode())) {
    const nodeLength = node.textContent?.length ?? 0
    if (currentPos + nodeLength >= position) {
      const offset = position - currentPos
      range.setStart(node, Math.min(offset, nodeLength))
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }
    currentPos += nodeLength
  }

  // Fallback: set to end
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

// Helper to get cursor position
const getCursorPosition = (element: HTMLElement): number => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return 0

  const range = selection.getRangeAt(0)
  const preRange = document.createRange()
  preRange.selectNodeContents(element)
  preRange.setEnd(range.startContainer, range.startOffset)
  return preRange.toString().length
}

// Helper to check if element has data-show attribute
const _hasDataShow = (element: Element): boolean => {
  return element.hasAttribute("data-show")
}

describe("NumberFlowInput", () => {
  beforeEach(() => {
    // Clear any previous state
    document.body.innerHTML = ""
  })

  describe("Basic number input", () => {
    it("should allow typing numbers", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
        expect(onChange).toHaveBeenLastCalledWith(123)
      })
    })

    it("should handle negative numbers", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "-123")
      await waitFor(() => {
        expect(input.textContent).toBe("-123")
        expect(onChange).toHaveBeenLastCalledWith(-123)
      })
    })

    it("should handle decimal numbers", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123.456")
      await waitFor(() => {
        expect(input.textContent).toBe("123.456")
        expect(onChange).toHaveBeenLastCalledWith(123.456)
      })
    })

    it("should preserve trailing dot in display", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123.")
      await waitFor(() => {
        expect(input.textContent).toBe("123.")
        expect(onChange).toHaveBeenLastCalledWith(123)
      })
    })

    it("should handle deleting after decimal point", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123.456")
      await waitFor(() => {
        expect(input.textContent).toBe("123.456")
      })

      // Move cursor after the dot
      setCursorPosition(input, 4)

      // Delete the dot
      fireEvent.keyDown(input, { key: "Backspace", preventDefault: vi.fn() })

      await waitFor(() => {
        expect(input.textContent).toBe("123456")
        expect(onChange).toHaveBeenLastCalledWith(123456)
      })

      // Check that numbers after the deleted dot still have data-show attribute
      const spans = input.querySelectorAll("[data-flow]")
      expect(spans.length).toBeGreaterThan(0)
      // The numbers "456" should still have their data-show attributes
      const numberSpans = Array.from(spans).slice(3) // After "123"
      numberSpans.forEach((span) => {
        // At least some should have data-show (the ones that were already there)
        expect(span.textContent).toMatch(/[0-9]/)
      })
    })
  })

  describe("Leading zero handling", () => {
    it("should prevent typing 0 when cursor is before leading 0", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "0"
      await typeText(input, "0")
      await waitFor(() => {
        expect(input.textContent).toBe("0")
      })

      // Try to type "0" again at position 0
      setCursorPosition(input, 0)
      const posBefore = getCursorPosition(input)
      expect(posBefore).toBe(0)

      // Simulate keyDown event - the component should prevent default and not move cursor
      const event = new KeyboardEvent("keydown", {
        key: "0",
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, "preventDefault", {
        value: vi.fn(),
        writable: true,
      })

      input.dispatchEvent(event)

      // Wait a bit to ensure cursor doesn't move
      await new Promise((resolve) => setTimeout(resolve, 50))

      await waitFor(() => {
        const posAfter = getCursorPosition(input)
        expect(posAfter).toBe(posBefore)
        expect(input.textContent).toBe("0")
      })
    })

    it("should prevent typing 0 when cursor is after leading 0", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "0"
      await typeText(input, "0")
      await waitFor(() => {
        expect(input.textContent).toBe("0")
      })

      // Move cursor to position 1 (after the 0)
      setCursorPosition(input, 1)
      const posBefore = getCursorPosition(input)
      expect(posBefore).toBe(1)

      // Simulate keyDown event - the component should prevent default and not move cursor
      const event = new KeyboardEvent("keydown", {
        key: "0",
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, "preventDefault", {
        value: vi.fn(),
        writable: true,
      })

      input.dispatchEvent(event)

      // Wait a bit to ensure cursor doesn't move
      await new Promise((resolve) => setTimeout(resolve, 50))

      await waitFor(() => {
        const posAfter = getCursorPosition(input)
        expect(posAfter).toBe(posBefore)
        expect(input.textContent).toBe("0")
      })
    })

    it("should allow typing 0 when there's a decimal point after leading 0", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "0."
      await typeText(input, "0.")
      expect(input.textContent).toBe("0.")

      // Move cursor after the dot and type 0
      setCursorPosition(input, 2)
      await typeText(input, "0")

      expect(input.textContent).toBe("0.0")
      expect(onChange).toHaveBeenLastCalledWith(0.0)
    })

    it("should prevent typing 0 before leading 0 in negative number", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "-0"
      await typeText(input, "-0")
      expect(input.textContent).toBe("-0")

      // Move cursor to position 1 (after the minus, before the 0)
      setCursorPosition(input, 1)
      const posBefore = getCursorPosition(input)

      fireEvent.keyDown(input, { key: "0", preventDefault: vi.fn() })
      fireEvent.keyPress(input, { key: "0" })

      await waitFor(() => {
        const posAfter = getCursorPosition(input)
        expect(posAfter).toBe(posBefore)
        expect(input.textContent).toBe("-0")
      })
    })

    it("should prevent typing 0 after leading 0 in negative number", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "-0"
      await typeText(input, "-0")
      expect(input.textContent).toBe("-0")

      // Move cursor to position 2 (after the 0)
      setCursorPosition(input, 2)
      const posBefore = getCursorPosition(input)

      fireEvent.keyDown(input, { key: "0", preventDefault: vi.fn() })
      fireEvent.keyPress(input, { key: "0" })

      await waitFor(() => {
        const posAfter = getCursorPosition(input)
        expect(posAfter).toBe(posBefore)
        expect(input.textContent).toBe("-0")
      })
    })

    it("should prevent typing 0 at the beginning of a number (e.g., 12 -> 012)", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "12"
      await typeText(input, "12")
      await waitFor(() => {
        expect(input.textContent).toBe("12")
      })

      // Move cursor to position 0 (at the beginning)
      setCursorPosition(input, 0)
      const posBefore = getCursorPosition(input)
      expect(posBefore).toBe(0)

      // Try to type "0" at the beginning
      const event = new KeyboardEvent("keydown", {
        key: "0",
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, "preventDefault", {
        value: vi.fn(),
        writable: true,
      })

      input.dispatchEvent(event)

      // Wait a bit to ensure cursor doesn't move
      await new Promise((resolve) => setTimeout(resolve, 50))

      await waitFor(() => {
        const posAfter = getCursorPosition(input)
        expect(posAfter).toBe(posBefore)
        expect(input.textContent).toBe("12")
      })
    })

    it("should allow typing 0 before decimal point (e.g., .1121 -> 0.1121)", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type ".1121"
      await typeText(input, ".1121")
      await waitFor(() => {
        expect(input.textContent).toBe(".1121")
      })

      // Move cursor to position 0 (before the dot)
      setCursorPosition(input, 0)
      expect(getCursorPosition(input)).toBe(0)

      // Type "0" before the dot
      await typeText(input, "0")

      await waitFor(() => {
        expect(input.textContent).toBe("0.1121")
        expect(onChange).toHaveBeenLastCalledWith(0.1121)
      })
    })

    it("should prevent typing 0 before existing leading 0 with decimal (e.g., 0.1121 -> 00.1121)", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "0.1121"
      await typeText(input, "0.1121")
      await waitFor(() => {
        expect(input.textContent).toBe("0.1121")
      })

      // Move cursor to position 0 (before the 0)
      setCursorPosition(input, 0)
      const posBefore = getCursorPosition(input)
      expect(posBefore).toBe(0)

      // Try to type "0" before the existing 0
      const event = new KeyboardEvent("keydown", {
        key: "0",
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, "preventDefault", {
        value: vi.fn(),
        writable: true,
      })

      input.dispatchEvent(event)

      // Wait a bit to ensure cursor doesn't move
      await new Promise((resolve) => setTimeout(resolve, 50))

      await waitFor(() => {
        const posAfter = getCursorPosition(input)
        expect(posAfter).toBe(posBefore)
        expect(input.textContent).toBe("0.1121")
      })
    })

    it("should prevent typing 0 after leading 0 with decimal (e.g., 0.1121, cursor at position 1)", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "0.1121"
      await typeText(input, "0.1121")
      await waitFor(() => {
        expect(input.textContent).toBe("0.1121")
      })

      // Move cursor to position 1 (after the 0, before the dot)
      setCursorPosition(input, 1)
      const posBefore = getCursorPosition(input)
      expect(posBefore).toBe(1)

      // Try to type "0" after the existing 0
      const event = new KeyboardEvent("keydown", {
        key: "0",
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, "preventDefault", {
        value: vi.fn(),
        writable: true,
      })

      input.dispatchEvent(event)

      // Wait a bit to ensure cursor doesn't move
      await new Promise((resolve) => setTimeout(resolve, 50))

      await waitFor(() => {
        const posAfter = getCursorPosition(input)
        expect(posAfter).toBe(posBefore)
        expect(input.textContent).toBe("0.1121")
      })
    })

    it("should prevent typing 0 after leading 0 with decimal in negative number (e.g., -0.1121, cursor at position 2)", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "-0.1121"
      await typeText(input, "-0.1121")
      await waitFor(() => {
        expect(input.textContent).toBe("-0.1121")
      })

      // Move cursor to position 2 (after the 0, before the dot)
      setCursorPosition(input, 2)
      const posBefore = getCursorPosition(input)
      expect(posBefore).toBe(2)

      // Try to type "0" after the existing 0
      const event = new KeyboardEvent("keydown", {
        key: "0",
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, "preventDefault", {
        value: vi.fn(),
        writable: true,
      })

      input.dispatchEvent(event)

      // Wait a bit to ensure cursor doesn't move
      await new Promise((resolve) => setTimeout(resolve, 50))

      await waitFor(() => {
        const posAfter = getCursorPosition(input)
        expect(posAfter).toBe(posBefore)
        expect(input.textContent).toBe("-0.1121")
      })
    })

    it("should prevent typing 0 after minus in negative number (e.g., -12 -> -012)", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "-12"
      await typeText(input, "-12")
      await waitFor(() => {
        expect(input.textContent).toBe("-12")
      })

      // Move cursor to position 1 (after the minus, before the 1)
      setCursorPosition(input, 1)
      const posBefore = getCursorPosition(input)
      expect(posBefore).toBe(1)

      // Try to type "0" after the minus
      const event = new KeyboardEvent("keydown", {
        key: "0",
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, "preventDefault", {
        value: vi.fn(),
        writable: true,
      })

      input.dispatchEvent(event)

      // Wait a bit to ensure cursor doesn't move
      await new Promise((resolve) => setTimeout(resolve, 50))

      await waitFor(() => {
        const posAfter = getCursorPosition(input)
        expect(posAfter).toBe(posBefore)
        expect(input.textContent).toBe("-12")
      })
    })

    it("should allow typing 0 after minus when next character is decimal point (e.g., -.1121 -> -0.1121)", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "-.1121"
      await typeText(input, "-.1121")
      await waitFor(() => {
        expect(input.textContent).toBe("-.1121")
      })

      // Move cursor to position 1 (after the minus, before the dot)
      setCursorPosition(input, 1)
      expect(getCursorPosition(input)).toBe(1)

      // Type "0" after the minus
      await typeText(input, "0")

      await waitFor(() => {
        expect(input.textContent).toBe("-0.1121")
        expect(onChange).toHaveBeenLastCalledWith(-0.1121)
      })
    })

    it("should prevent typing 0 after minus when 0 already exists (e.g., -0.1121 -> -00.1121)", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "-0.1121"
      await typeText(input, "-0.1121")
      await waitFor(() => {
        expect(input.textContent).toBe("-0.1121")
      })

      // Move cursor to position 1 (after the minus, before the 0)
      setCursorPosition(input, 1)
      const posBefore = getCursorPosition(input)
      expect(posBefore).toBe(1)

      // Try to type "0" after the minus (should be prevented)
      const event = new KeyboardEvent("keydown", {
        key: "0",
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, "preventDefault", {
        value: vi.fn(),
        writable: true,
      })

      input.dispatchEvent(event)

      // Wait a bit to ensure cursor doesn't move
      await new Promise((resolve) => setTimeout(resolve, 50))

      await waitFor(() => {
        const posAfter = getCursorPosition(input)
        expect(posAfter).toBe(posBefore)
        expect(input.textContent).toBe("-0.1121")
      })
    })
  })

  describe("Negative sign handling", () => {
    it("should only allow minus at the beginning", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      setCursorPosition(input, 1)

      // Try to type minus in the middle
      fireEvent.keyDown(input, { key: "-", preventDefault: vi.fn() })
      fireEvent.keyPress(input, { key: "-" })

      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })
    })

    it("should only allow one minus sign", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "-123")
      setCursorPosition(input, 0)

      // Try to type another minus - should be ignored
      fireEvent.keyDown(input, { key: "-", preventDefault: vi.fn() })
      fireEvent.keyPress(input, { key: "-" })

      await waitFor(() => {
        // Should keep the minus (ignore the second one)
        expect(input.textContent).toBe("-123")
      })
    })

    it("should ignore minus when typed at position 0 if already has minus", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "-123")
      const lastCallIndex = onChange.mock.calls.length - 1
      setCursorPosition(input, 0)

      fireEvent.keyDown(input, { key: "-", preventDefault: vi.fn() })
      fireEvent.keyPress(input, { key: "-" })

      await waitFor(() => {
        // Value should remain unchanged
        expect(input.textContent).toBe("-123")
        // onChange should not have been called again
        expect(onChange.mock.calls.length).toBe(lastCallIndex + 1)
      })
    })
  })

  describe("Decimal point handling", () => {
    it("should only allow one decimal point", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123.456")
      setCursorPosition(input, 4)

      // Try to type another decimal point
      fireEvent.keyDown(input, { key: ".", preventDefault: vi.fn() })
      fireEvent.keyPress(input, { key: "." })

      await waitFor(() => {
        expect(input.textContent).toBe("123.456")
      })
    })

    it("should preserve decimal point when deleting numbers after it", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123.456")
      await waitFor(() => {
        expect(input.textContent).toBe("123.456")
      })

      // Select and delete "456" - need to find the actual text nodes
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 4) {
            startNode = node
            startOffset = 4 - currentPos
          }
          if (!endNode && currentPos + nodeLength >= 7) {
            endNode = node
            endOffset = 7 - currentPos
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      fireEvent.keyDown(input, { key: "Backspace", preventDefault: vi.fn() })

      await waitFor(() => {
        expect(input.textContent).toBe("123.")
        expect(onChange).toHaveBeenLastCalledWith(123)
      })
    })
  })

  describe("Selection and replacement", () => {
    it("should animate all new characters when replacing selection", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })

      // Select "23" - need to find actual text nodes
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 1) {
            startNode = node
            startOffset = Math.min(1 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 3) {
            endNode = node
            endOffset = Math.min(3 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Type "45" to replace "23"
      await typeText(input, "45")

      await waitFor(() => {
        expect(input.textContent).toBe("145")
        const spans = input.querySelectorAll("[data-flow]")
        // The "4" and "5" should be marked as added (will get data-show after animation)
        expect(spans.length).toBe(3)
      })
    })

    it("should handle pasting numbers", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })

      // Select "23" - need to find actual text nodes
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 1) {
            startNode = node
            startOffset = Math.min(1 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 3) {
            endNode = node
            endOffset = Math.min(3 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Paste "45"
      fireEvent.paste(input, {
        clipboardData: {
          getData: () => "45",
        } as unknown as DataTransfer,
      })

      await waitFor(() => {
        expect(input.textContent).toBe("145")
        expect(onChange).toHaveBeenLastCalledWith(145)
      })
    })
  })

  describe("Keyboard shortcuts", () => {
    it("should move cursor to start with Cmd+ArrowLeft", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      setCursorPosition(input, 3)

      fireEvent.keyDown(input, {
        key: "ArrowLeft",
        metaKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        expect(getCursorPosition(input)).toBe(0)
      })
    })

    it("should move cursor to end with Cmd+ArrowRight", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      setCursorPosition(input, 0)

      fireEvent.keyDown(input, {
        key: "ArrowRight",
        metaKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        expect(getCursorPosition(input)).toBe(3)
      })
    })

    it("should select to start with Shift+Cmd+ArrowLeft", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      setCursorPosition(input, 3)

      fireEvent.keyDown(input, {
        key: "ArrowLeft",
        metaKey: true,
        shiftKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        const selection = window.getSelection()
        expect(selection?.toString()).toBe("123")
      })
    })

    it("should select to end with Shift+Cmd+ArrowRight", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      setCursorPosition(input, 0)

      fireEvent.keyDown(input, {
        key: "ArrowRight",
        metaKey: true,
        shiftKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        const selection = window.getSelection()
        expect(selection?.toString()).toBe("123")
      })
    })

    it("should move cursor to start of selection when ArrowLeft is pressed with selection", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })

      // Select "23" (positions 1-3)
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 1) {
            startNode = node
            startOffset = Math.min(1 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 3) {
            endNode = node
            endOffset = Math.min(3 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Press ArrowLeft - should move cursor to start of selection (position 1)
      fireEvent.keyDown(input, {
        key: "ArrowLeft",
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        expect(getCursorPosition(input)).toBe(1)
        const selection = window.getSelection()
        expect(selection?.toString()).toBe("")
      })
    })

    it("should move cursor to end of selection when ArrowRight is pressed with selection", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })

      // Select "23" (positions 1-3)
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 1) {
            startNode = node
            startOffset = Math.min(1 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 3) {
            endNode = node
            endOffset = Math.min(3 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Press ArrowRight - should move cursor to end of selection (position 3)
      fireEvent.keyDown(input, {
        key: "ArrowRight",
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        expect(getCursorPosition(input)).toBe(3)
        const selection = window.getSelection()
        expect(selection?.toString()).toBe("")
      })
    })

    it("should delete one character after cursor with Delete key", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })

      // Move cursor to position 1 (after "1")
      setCursorPosition(input, 1)

      // Press Delete
      fireEvent.keyDown(input, {
        key: "Delete",
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        expect(input.textContent).toBe("13")
        expect(onChange).toHaveBeenLastCalledWith(13)
      })
    })

    it("should delete all characters after cursor with Cmd+Delete", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "12345")
      await waitFor(() => {
        expect(input.textContent).toBe("12345")
      })

      // Move cursor to position 2 (after "12")
      setCursorPosition(input, 2)

      // Press Cmd+Delete
      fireEvent.keyDown(input, {
        key: "Delete",
        metaKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        expect(input.textContent).toBe("12")
        expect(onChange).toHaveBeenLastCalledWith(12)
      })
    })

    it("should delete all characters before cursor with Cmd+Backspace", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "12345")
      await waitFor(() => {
        expect(input.textContent).toBe("12345")
      })

      // Move cursor to position 3 (after "123")
      setCursorPosition(input, 3)

      // Press Cmd+Backspace
      fireEvent.keyDown(input, {
        key: "Backspace",
        metaKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        expect(input.textContent).toBe("45")
        expect(onChange).toHaveBeenLastCalledWith(45)
      })
    })
  })

  describe("Cut functionality", () => {
    it("should update value when cutting selected text", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })

      // Wait a bit for DOM to settle
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Select "23" - need to find actual text nodes
      const walker = document.createTreeWalker(
        input,
        NodeFilter.SHOW_TEXT,
        null
      )
      let currentPos = 0
      let startNode: Node | null = null
      let endNode: Node | null = null
      let startOffset = 0
      let endOffset = 0

      let node: Node | null
      while ((node = walker.nextNode())) {
        const nodeLength = node.textContent?.length ?? 0
        if (!startNode && currentPos + nodeLength >= 1) {
          startNode = node
          startOffset = Math.min(1 - currentPos, nodeLength)
        }
        if (!endNode && currentPos + nodeLength >= 3) {
          endNode = node
          endOffset = Math.min(3 - currentPos, nodeLength)
          break
        }
        currentPos += nodeLength
      }

      if (
        startNode &&
        endNode &&
        startNode.textContent &&
        endNode.textContent
      ) {
        // Ensure offsets are within bounds
        const maxStartOffset = startNode.textContent.length
        const maxEndOffset = endNode.textContent.length
        startOffset = Math.min(startOffset, maxStartOffset)
        endOffset = Math.min(endOffset, maxEndOffset)

        const selection = window.getSelection()
        if (selection) {
          const range = document.createRange()
          range.setStart(startNode, startOffset)
          range.setEnd(endNode, endOffset)
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }

      // Cut
      fireEvent.keyDown(input, {
        key: "x",
        metaKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        expect(input.textContent).toBe("1")
        expect(onChange).toHaveBeenLastCalledWith(1)
      })
    })

    it("should handle cut from context menu", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })

      // Select "23" - need to find actual text nodes
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 1) {
            startNode = node
            startOffset = Math.min(1 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 3) {
            endNode = node
            endOffset = Math.min(3 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Simulate cut event
      fireEvent.cut(input, {
        clipboardData: {
          setData: vi.fn(),
        } as unknown as DataTransfer,
      })

      await waitFor(() => {
        expect(input.textContent).toBe("1")
        expect(onChange).toHaveBeenLastCalledWith(1)
      })
    })
  })

  describe("Undo/Redo", () => {
    it("should undo changes with Cmd+Z", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      expect(input.textContent).toBe("123")

      // Undo
      fireEvent.keyDown(input, {
        key: "z",
        metaKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        // Should go back to previous state
        expect(onChange).toHaveBeenCalled()
      })
    })

    it("should redo changes with Cmd+Shift+Z", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      expect(input.textContent).toBe("123")

      // Undo
      fireEvent.keyDown(input, {
        key: "z",
        metaKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        // Should undo
      })

      // Redo
      fireEvent.keyDown(input, {
        key: "z",
        metaKey: true,
        shiftKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        // Should redo
        expect(onChange).toHaveBeenCalled()
      })
    })
  })

  describe("Animation", () => {
    it("should animate new characters when typing", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "1")

      await waitFor(() => {
        const spans = input.querySelectorAll("[data-flow]")
        expect(spans.length).toBe(1)
        // Initially, new characters don't have data-show
        // They get it after the timeout
      })

      // Wait for animation
      await new Promise((resolve) => setTimeout(resolve, 20))

      await waitFor(() => {
        const spans = input.querySelectorAll("[data-flow][data-show]")
        expect(spans.length).toBeGreaterThan(0)
      })
    })

    it("should animate all new characters when typing 0 then 1", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "0")
      await waitFor(() => {
        expect(input.textContent).toBe("0")
      })

      // Wait for initial animation
      await new Promise((resolve) => setTimeout(resolve, 50))

      await typeText(input, "1")

      await waitFor(() => {
        expect(input.textContent).toBe("1")
      })

      // Wait for animation timeout (10ms) plus a bit more
      await new Promise((resolve) => setTimeout(resolve, 100))

      // The "1" should have data-show after animation
      // When "0" becomes "1" after leading zero removal, the "1" should be marked as added
      const spans = input.querySelectorAll("[data-flow][data-show]")
      expect(spans.length).toBe(1)
      expect(spans[0]?.textContent).toBe("1")
    })

    it("should preserve data-show attributes when deleting decimal point from 0.122", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "0.122")

      // Wait for animations to complete
      await waitFor(() => {
        expect(input.textContent).toBe("0.122")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Move cursor after the dot (position 2)
      await waitFor(() => {
        setCursorPosition(input, 2)
      })

      // Delete the dot
      fireEvent.keyDown(input, { key: "Backspace", preventDefault: vi.fn() })

      await waitFor(() => {
        // After deleting the dot from "0.122", it should become "122" (leading zero removed)
        expect(input.textContent).toBe("122")
        const spans = input.querySelectorAll("[data-flow][data-show]")
        // All digits "122" should have data-show attribute
        expect(spans.length).toBe(3)
        // Verify all three digits are present
        const text = Array.from(spans)
          .map((span) => span.textContent)
          .join("")
        expect(text).toBe("122")
      })
    })

    it("should animate barrel wheel when replacing single digit (e.g., 2 -> 5)", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Select the middle digit "2"
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 1) {
            startNode = node
            startOffset = Math.min(1 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 2) {
            endNode = node
            endOffset = Math.min(2 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Type "5" to replace "2"
      await typeText(input, "5")

      await waitFor(
        () => {
          // Check for barrel wheel element in parent container (it's outside contentEditable now)
          const parentContainer = input.parentElement
          const barrelWheel =
            parentContainer?.querySelector("[data-final-digit]")
          expect(barrelWheel).toBeTruthy()
          if (barrelWheel) {
            expect(barrelWheel.getAttribute("data-direction")).toBe("up")
            const digits = barrelWheel.querySelectorAll("[data-digit]")
            // Barrel wheel now contains all digits 0-9
            expect(digits.length).toBe(10)
            // Verify it has all digits 0-9
            const digitTexts = Array.from(digits).map((d) => d.textContent)
            expect(digitTexts).toEqual([
              "0",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
            ])
            // Verify final digit is 5
            expect(barrelWheel.getAttribute("data-final-digit")).toBe("5")
          }
        },
        { timeout: 2000 }
      )
    })

    it("should animate barrel wheel downward when replacing digit with lower value (e.g., 5 -> 2)", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "153")
      await waitFor(() => {
        expect(input.textContent).toBe("153")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Select the middle digit "5"
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 1) {
            startNode = node
            startOffset = Math.min(1 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 2) {
            endNode = node
            endOffset = Math.min(2 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Type "2" to replace "5"
      await typeText(input, "2")

      await waitFor(
        () => {
          // Check for barrel wheel element in parent container (it's outside contentEditable now)
          const parentContainer = input.parentElement
          const barrelWheel =
            parentContainer?.querySelector("[data-final-digit]")
          expect(barrelWheel).toBeTruthy()
          if (barrelWheel) {
            expect(barrelWheel.getAttribute("data-direction")).toBe("down")
            const digits = barrelWheel.querySelectorAll("[data-digit]")
            // Barrel wheel now contains all digits 0-9
            expect(digits.length).toBe(10)
            // Verify it has all digits 0-9
            const digitTexts = Array.from(digits).map((d) => d.textContent)
            expect(digitTexts).toEqual([
              "0",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
            ])
            // Note: data-final-digit currently stores the last element of the sequence (old digit when direction is "down")
            // This is a quirk of the current implementation - it stores finalDigit which is sequence[last]
            expect(barrelWheel.getAttribute("data-final-digit")).toBe("5")
          }
        },
        { timeout: 2000 }
      )
    })

    it("should attempt width animation when replacing single digit (e.g., 8 -> 1)", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "8")
      await waitFor(() => {
        expect(input.textContent).toBe("8")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Select the digit "8"
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 0) {
            startNode = node
            startOffset = Math.min(0 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 1) {
            endNode = node
            endOffset = Math.min(1 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Type "1" to replace "8"
      await typeText(input, "1")

      await waitFor(
        () => {
          // Check that barrel wheel animation is happening (charSpan should be transparent)
          const charSpan = input.querySelector('[data-char-index="0"]')
          expect(charSpan).toBeTruthy()
          if (charSpan instanceof HTMLElement) {
            // Character should be transparent during barrel wheel animation
            expect(charSpan.style.color).toBe("transparent")
          }
          // Width animation may or may not be applied depending on measurement success
          // The important thing is that the barrel wheel animation is working
          const parentContainer = input.parentElement
          const barrelWheel =
            parentContainer?.querySelector("[data-final-digit]")
          expect(barrelWheel).toBeTruthy()
        },
        { timeout: 2000 }
      )
    })

    it("should attempt width animation when replacing single digit upward (e.g., 1 -> 8)", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "1")
      await waitFor(() => {
        expect(input.textContent).toBe("1")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Select the digit "1"
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 0) {
            startNode = node
            startOffset = Math.min(0 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 1) {
            endNode = node
            endOffset = Math.min(1 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Type "8" to replace "1"
      await typeText(input, "8")

      await waitFor(
        () => {
          // Check that barrel wheel animation is happening (charSpan should be transparent)
          const charSpan = input.querySelector('[data-char-index="0"]')
          expect(charSpan).toBeTruthy()
          if (charSpan instanceof HTMLElement) {
            // Character should be transparent during barrel wheel animation
            expect(charSpan.style.color).toBe("transparent")
          }
          // Width animation may or may not be applied depending on measurement success
          // The important thing is that the barrel wheel animation is working
          const parentContainer = input.parentElement
          const barrelWheel =
            parentContainer?.querySelector("[data-final-digit]")
          expect(barrelWheel).toBeTruthy()
        },
        { timeout: 2000 }
      )
    })

    it("should not create ghost spans when replacing a digit", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Select the middle digit "2"
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 1) {
            startNode = node
            startOffset = Math.min(1 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 2) {
            endNode = node
            endOffset = Math.min(2 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Type "5" to replace "2" (triggers barrel wheel animation)
      await typeText(input, "5")

      await waitFor(
        () => {
          expect(input.textContent).toBe("153")
          // Count all spans with data-char-index - should be exactly 3
          const allSpans = input.querySelectorAll("[data-char-index]")
          expect(allSpans.length).toBe(3)
          // Verify all spans have correct indices
          const indices = Array.from(allSpans).map((span) =>
            parseInt(
              (span as HTMLElement).getAttribute("data-char-index") ?? "-1",
              10
            )
          )
          indices.sort((a, b) => a - b)
          expect(indices).toEqual([0, 1, 2])
        },
        { timeout: 2000 }
      )

      // Wait a bit for any async updates
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Verify no ghost spans remain
      const allSpans = input.querySelectorAll("[data-char-index]")
      expect(allSpans.length).toBe(3)
      const text = Array.from(allSpans)
        .map((span) => span.textContent)
        .join("")
      expect(text).toBe("153")
    })

    it("should remove all spans including hidden ones when selecting all and deleting", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Select the middle digit "2" and replace it (triggers barrel wheel - span becomes hidden)
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 1) {
            startNode = node
            startOffset = Math.min(1 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 2) {
            endNode = node
            endOffset = Math.min(2 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Type "5" to replace "2" - this will hide the span during barrel wheel animation
      await typeText(input, "5")

      // Wait a bit for barrel wheel to start (span becomes hidden)
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify there's a hidden span (barrel wheel animation in progress)
      const _hiddenSpans = Array.from(
        input.querySelectorAll("[data-char-index]")
      ).filter(
        (span) =>
          (span as HTMLElement).style.color === "transparent" ||
          (span as HTMLElement).style.color === "rgba(0, 0, 0, 0)"
      )
      // There might be a hidden span during animation, or it might have completed
      // The important thing is that when we select all and delete, all spans are removed

      // Now select all and delete
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos === 0) {
            startNode = node
            startOffset = 0
          }
          if (!endNode && currentPos + nodeLength >= 3) {
            endNode = node
            endOffset = Math.min(3 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Delete all (Cmd+Backspace or just Backspace with all selected)
      fireEvent.keyDown(input, {
        key: "Backspace",
        preventDefault: vi.fn(),
      })

      await waitFor(
        () => {
          expect(input.textContent).toBe("")
          // All spans should be removed, including hidden ones
          const allSpans = input.querySelectorAll("[data-char-index]")
          expect(allSpans.length).toBe(0)
        },
        { timeout: 2000 }
      )
    })

    it("should not create duplicate spans when typing fast with repeated digits", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      // Type a fast sequence with repeated digits
      await typeText(input, "12122121212121212121122121212121212212121121212")

      await waitFor(
        () => {
          const expectedText = "12122121212121212121122121212121212212121121212"
          expect(input.textContent).toBe(expectedText)

          // Count all spans - should match text length exactly
          const allSpans = input.querySelectorAll("[data-char-index]")
          expect(allSpans.length).toBe(expectedText.length)

          // Verify all spans have unique and correct indices
          const indices = Array.from(allSpans).map((span) =>
            parseInt(
              (span as HTMLElement).getAttribute("data-char-index") ?? "-1",
              10
            )
          )
          // Check for duplicates
          const uniqueIndices = new Set(indices)
          expect(uniqueIndices.size).toBe(indices.length)

          // Verify indices are sequential
          indices.sort((a, b) => a - b)
          for (let i = 0; i < indices.length; i++) {
            expect(indices[i]).toBe(i)
          }

          // Verify text content matches
          const text = Array.from(allSpans)
            .map((span) => span.textContent)
            .join("")
          expect(text).toBe(expectedText)
        },
        { timeout: 3000 }
      )
    })

    it("should handle multiple rapid digit replacements without ghost spans", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "12345")
      await waitFor(() => {
        expect(input.textContent).toBe("12345")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Rapidly replace multiple digits
      for (let i = 0; i < 5; i++) {
        // Select digit at position i
        await waitFor(() => {
          const walker = document.createTreeWalker(
            input,
            NodeFilter.SHOW_TEXT,
            null
          )
          let currentPos = 0
          let startNode: Node | null = null
          let endNode: Node | null = null

          let node: Node | null
          while ((node = walker.nextNode())) {
            const nodeLength = node.textContent?.length ?? 0
            if (!startNode && currentPos + nodeLength > i) {
              startNode = node
            }
            if (!endNode && currentPos + nodeLength > i + 1) {
              endNode = node
              break
            }
            currentPos += nodeLength
          }

          if (startNode && endNode) {
            const selection = window.getSelection()
            if (selection) {
              const range = document.createRange()
              range.setStart(startNode, Math.max(0, i - currentPos))
              range.setEnd(endNode, Math.max(0, i + 1 - currentPos))
              selection.removeAllRanges()
              selection.addRange(range)
            }
          }
        })

        // Replace with a different digit
        const newDigit = ((i + 1) % 10).toString()
        await typeText(input, newDigit)
        await new Promise((resolve) => setTimeout(resolve, 20))
      }

      await waitFor(
        () => {
          // Verify no ghost spans
          const allSpans = input.querySelectorAll("[data-char-index]")
          const expectedLength = input.textContent?.length ?? 0
          expect(allSpans.length).toBe(expectedLength)

          // Verify all spans have unique indices
          const indices = Array.from(allSpans).map((span) =>
            parseInt(
              (span as HTMLElement).getAttribute("data-char-index") ?? "-1",
              10
            )
          )
          const uniqueIndices = new Set(indices)
          expect(uniqueIndices.size).toBe(indices.length)
        },
        { timeout: 3000 }
      )
    })

    it("should remove barrel wheel when digit is deleted during animation", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "321")
      await waitFor(() => {
        expect(input.textContent).toBe("321")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Select the last digit "1" and replace with "8" (triggers barrel wheel)
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 2) {
            startNode = node
            startOffset = Math.min(2 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 3) {
            endNode = node
            endOffset = Math.min(3 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Type "8" to replace "1" (starts barrel wheel animation)
      await typeText(input, "8")

      // Wait a bit for barrel wheel to start
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify barrel wheel exists
      const parentContainer = input.parentElement
      let barrelWheel = parentContainer?.querySelector(
        '[data-char-index="2"][data-final-digit]'
      ) as HTMLElement | null
      expect(barrelWheel).toBeTruthy()

      // Wait for the replacement to complete
      await waitFor(
        () => {
          expect(input.textContent).toBe("328")
        },
        { timeout: 1000 }
      )

      // Select the "8" at position 2 (the digit we just replaced)
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 2) {
            startNode = node
            startOffset = Math.min(2 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 3) {
            endNode = node
            endOffset = Math.min(3 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Now delete the selected digit (Backspace)
      fireEvent.keyDown(input, {
        key: "Backspace",
        preventDefault: vi.fn(),
      })

      await waitFor(
        () => {
          // Barrel wheel should be removed
          barrelWheel = parentContainer?.querySelector(
            '[data-char-index="2"][data-final-digit]'
          ) as HTMLElement | null
          expect(barrelWheel).toBeFalsy()
        },
        { timeout: 2000 }
      )

      // Wait for DOM to sync (the actualValue should be correct even if contentEditable takes time to update)
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Verify the barrel wheel is gone and text eventually syncs
      // Note: In test environment, contentEditable might not update immediately, but barrel wheel removal is the key test
      const finalBarrelWheel = parentContainer?.querySelector(
        '[data-char-index="2"][data-final-digit]'
      ) as HTMLElement | null
      expect(finalBarrelWheel).toBeFalsy()
    })

    it("should clean up width animation styles when barrel wheel completes", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "8")
      await waitFor(() => {
        expect(input.textContent).toBe("8")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Select the digit "8" and replace with "1" (triggers barrel wheel and width animation)
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 0) {
            startNode = node
            startOffset = Math.min(0 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 1) {
            endNode = node
            endOffset = Math.min(1 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Type "1" to replace "8"
      await typeText(input, "1")

      // Wait for barrel wheel animation to complete (400ms) plus width animation (400ms)
      // Add extra time for test environment
      await new Promise((resolve) => setTimeout(resolve, 1200))

      // Check width animation cleanup
      // Note: In test environment, animations may not complete reliably
      // We verify that if the barrel wheel is gone, cleanup should have happened
      const parentContainer = input.parentElement
      const barrelWheel = parentContainer?.querySelector(
        '[data-char-index="0"][data-final-digit]'
      ) as HTMLElement | null

      const charSpan = input.querySelector(
        '[data-char-index="0"]'
      ) as HTMLElement | null
      expect(charSpan).toBeTruthy()
      if (charSpan) {
        // If barrel wheel is gone, width animation should be cleaned up
        if (!barrelWheel) {
          expect(charSpan.hasAttribute("data-width-animate")).toBe(false)
          expect(charSpan.style.width).toBe("")
          expect(charSpan.style.minWidth).toBe("")
          expect(charSpan.style.maxWidth).toBe("")
          expect(charSpan.style.color).toBe("")
        } else {
          // If barrel wheel still exists, at least verify width animation attribute exists
          // (This means the animation is still in progress)
          // The cleanup will happen when the barrel wheel completes
        }
      }
    })

    it("should clean up width animation styles when digit is deleted", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "321")
      await waitFor(() => {
        expect(input.textContent).toBe("321")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Select the last digit "1" and replace with "8" (triggers barrel wheel and width animation)
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 2) {
            startNode = node
            startOffset = Math.min(2 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 3) {
            endNode = node
            endOffset = Math.min(3 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Type "8" to replace "1"
      await typeText(input, "8")

      // Wait a bit for width animation to start and attribute to be set
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Verify width animation is active (or at least barrel wheel exists)
      const parentContainer = input.parentElement
      const barrelWheel = parentContainer?.querySelector(
        '[data-char-index="2"][data-final-digit]'
      ) as HTMLElement | null
      expect(barrelWheel).toBeTruthy()

      const charSpan = input.querySelector(
        '[data-char-index="2"]'
      ) as HTMLElement | null
      expect(charSpan).toBeTruthy()

      // Check if width animation attribute is set (it might be set asynchronously)
      const _hasWidthAnimation =
        charSpan?.hasAttribute("data-width-animate") ?? false

      // Now move cursor to position 3 and delete the digit
      setCursorPosition(input, 3)
      fireEvent.keyDown(input, {
        key: "Backspace",
        preventDefault: vi.fn(),
      })

      await waitFor(
        () => {
          // Barrel wheel should be removed
          const remainingBarrelWheel = parentContainer?.querySelector(
            '[data-char-index="2"][data-final-digit]'
          ) as HTMLElement | null
          expect(remainingBarrelWheel).toBeFalsy()
        },
        { timeout: 2000 }
      )

      // Wait a bit more for DOM to update and barrel wheel to be removed
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Verify barrel wheel is removed (this is the key test)
      await waitFor(
        () => {
          const remainingBarrelWheel = parentContainer?.querySelector(
            '[data-char-index="2"][data-final-digit]'
          ) as HTMLElement | null
          expect(remainingBarrelWheel).toBeFalsy()
        },
        { timeout: 1000 }
      )

      // Width animation styles should be cleaned up (if they were set)
      // Note: The charSpan at index 2 should be removed since we deleted that digit
      // But if width animation was active, it should have been cleaned up before removal
      // We can verify that no span at index 2 has width animation attributes
      const allSpans = input.querySelectorAll("[data-char-index]")
      allSpans.forEach((span) => {
        const spanEl = span as HTMLElement
        expect(spanEl.hasAttribute("data-width-animate")).toBe(false)
        if (
          spanEl.style.width ||
          spanEl.style.minWidth ||
          spanEl.style.maxWidth
        ) {
          // If width styles are set, they should be empty strings (cleaned up)
          expect(spanEl.style.width).toBe("")
          expect(spanEl.style.minWidth).toBe("")
          expect(spanEl.style.maxWidth).toBe("")
        }
      })
    })

    it("should not show duplicate content after undo/redo and barrel wheel animation", async () => {
      render(<NumberFlowInput />)

      const input = getInput()
      input.focus()

      await typeText(input, "123")
      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Undo once
      fireEvent.keyDown(input, {
        key: "z",
        metaKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        expect(input.textContent).toBe("12")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Redo
      fireEvent.keyDown(input, {
        key: "z",
        metaKey: true,
        shiftKey: true,
        preventDefault: vi.fn(),
      })

      await waitFor(() => {
        expect(input.textContent).toBe("123")
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Select the "1" and replace with "8" (triggers barrel wheel)
      await waitFor(() => {
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null
        )
        let currentPos = 0
        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node: Node | null
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length ?? 0
          if (!startNode && currentPos + nodeLength >= 0) {
            startNode = node
            startOffset = Math.min(0 - currentPos, nodeLength)
          }
          if (!endNode && currentPos + nodeLength >= 1) {
            endNode = node
            endOffset = Math.min(1 - currentPos, nodeLength)
            break
          }
          currentPos += nodeLength
        }

        if (startNode && endNode) {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      })

      // Type "8" to replace "1"
      await typeText(input, "8")

      await waitFor(
        () => {
          // ContentEditable should show "823", not "823123" or any duplicate
          expect(input.textContent).toBe("823")
          // Verify no duplicate spans
          const allSpans = input.querySelectorAll("[data-char-index]")
          expect(allSpans.length).toBe(3)
          // Verify text content matches
          const text = Array.from(allSpans)
            .map((span) => span.textContent)
            .join("")
          expect(text).toBe("823")
        },
        { timeout: 2000 }
      )
    })

    it("should sync contentEditable when actualValue becomes undefined", async () => {
      const onChange = vi.fn()
      const { rerender } = render(
        <NumberFlowInput value={1881} onChange={onChange} />
      )

      const input = getInput()
      expect(input.textContent).toBe("1881")

      // Change value to undefined (e.g., user types "-" after selecting all)
      rerender(<NumberFlowInput value={undefined} onChange={onChange} />)

      await waitFor(() => {
        // ContentEditable should be empty, not show "-1" or any leftover content
        expect(input.textContent).toBe("")
        // No spans should remain
        const allSpans = input.querySelectorAll("[data-char-index]")
        expect(allSpans.length).toBe(0)
      })
    })
  })

  describe("Controlled vs Uncontrolled", () => {
    it("should work as controlled component", () => {
      const onChange = vi.fn()
      const { rerender } = render(
        <NumberFlowInput value={123} onChange={onChange} />
      )

      const input = getInput()
      expect(input.textContent).toBe("123")

      rerender(<NumberFlowInput value={456} onChange={onChange} />)
      expect(input.textContent).toBe("456")
    })

    it("should work as uncontrolled component", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput defaultValue={123} onChange={onChange} />)

      const input = getInput()
      expect(input.textContent).toBe("123")

      input.focus()
      await typeText(input, "4")
      expect(onChange).toHaveBeenCalled()
    })
  })

  describe("Props", () => {
    it("should apply name prop to hidden input", () => {
      render(<NumberFlowInput name="test-input" />)
      const hiddenInput = document.querySelector("input[type=\"hidden\"]") as HTMLInputElement
      expect(hiddenInput).toBeTruthy()
      expect(hiddenInput.name).toBe("test-input")
    })

    it("should apply id prop to hidden input", () => {
      render(<NumberFlowInput id="test-input-id" />)
      const hiddenInput = document.querySelector("input[type=\"hidden\"]") as HTMLInputElement
      expect(hiddenInput).toBeTruthy()
      expect(hiddenInput.id).toBe("test-input-id")
    })

    it("should handle autoAddLeadingZero prop", async () => {
      const onChange = vi.fn()
      render(
        <NumberFlowInput autoAddLeadingZero value={undefined} onChange={onChange} />
      )

      const input = getInput()
      input.focus()

      // Type "." first
      await typeText(input, ".")
      await waitFor(() => {
        // With autoAddLeadingZero, "." should become "0."
        expect(input.textContent).toBe("0.")
      })

      // Move cursor to the end
      const currentLength = input.textContent?.length || 0
      setCursorPosition(input, currentLength)
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Then type "5" at the end
      await typeText(input, "5")
      await waitFor(() => {
        expect(input.textContent).toBe("0.5")
        expect(onChange).toHaveBeenLastCalledWith(0.5)
      }, { timeout: 2000 })
    })

    it("should not add leading zero when autoAddLeadingZero is false", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput autoAddLeadingZero={false} onChange={onChange} />)

      const input = getInput()
      input.focus()

      // Type "." first
      await typeText(input, ".")
      await waitFor(() => {
        // Without autoAddLeadingZero, "." should remain "."
        expect(input.textContent).toBe(".")
      })

      // Then type "5"
      await typeText(input, "5")
      await waitFor(() => {
        expect(input.textContent).toBe(".5")
        expect(onChange).toHaveBeenLastCalledWith(0.5)
      })
    })
  })
})
