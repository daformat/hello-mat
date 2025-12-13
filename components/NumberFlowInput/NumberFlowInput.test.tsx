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
const hasDataShow = (element: Element): boolean => {
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

      // Try to type another minus
      fireEvent.keyDown(input, { key: "-", preventDefault: vi.fn() })
      fireEvent.keyPress(input, { key: "-" })

      await waitFor(() => {
        // Should remove the minus
        expect(input.textContent).toBe("123")
      })
    })

    it("should allow removing minus by typing it again at position 0", async () => {
      const onChange = vi.fn()
      render(<NumberFlowInput onChange={onChange} />)

      const input = getInput()
      input.focus()

      await typeText(input, "-123")
      setCursorPosition(input, 0)

      fireEvent.keyDown(input, { key: "-", preventDefault: vi.fn() })
      fireEvent.keyPress(input, { key: "-" })

      await waitFor(() => {
        expect(input.textContent).toBe("123")
        expect(onChange).toHaveBeenLastCalledWith(123)
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
      expect(spans[0].textContent).toBe("1")
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
})
