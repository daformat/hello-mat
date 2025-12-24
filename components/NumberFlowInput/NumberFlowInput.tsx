import {
  ClipboardEventHandler,
  ComponentPropsWithoutRef,
  CompositionEventHandler,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { MaybeUndefined } from "@/components/Media/utils/maybe";

import {
  cleanupWidthAnimation,
  clearBarrelWheelsAndSpans,
  getAllBarrelWheels,
  getBarrelWheel,
  repositionBarrelWheel,
  setWidthConstraints,
} from "./barrelWheel";
import { getChanges, getFormattedChanges, getPositionChanges } from "./changes";
import styles from "./NumberFlowInput.module.scss";
import { cleanText, parseNumberValue } from "./textCleaning";
import {
  getSelectionRange,
  isTransparent,
  measureText,
  removeTransparentColor,
  setCursorAtPosition,
  setCursorPositionInElement,
} from "./utils";

/**
 * Move an element in the DOM while preserving any ongoing CSS translate animation.
 * CSS transitions are cancelled when elements are moved in DOM, so we use
 * Web Animations API to continue the animation from where it left off.
 */
const moveElementPreservingAnimation = (
  element: HTMLElement,
  parent: HTMLElement,
  referenceNode: Node | null
): void => {
  // Check if element has ongoing translate animation (data-flow attribute)
  const hasFlowAnimation = element.hasAttribute("data-flow");
  const hasShowAttribute = element.hasAttribute("data-show");

  // Only need to preserve animation if it's a flow element that's still animating
  // (has data-flow but hasn't reached final state with data-show, or just got data-show)
  let translateState: { from: string; progress: number } | null = null;

  if (hasFlowAnimation) {
    // Get the current computed translate value
    const computedStyle = window.getComputedStyle(element);
    const currentTranslate = computedStyle.translate;

    // Parse the translate value to determine animation progress
    // data-flow starts at "0 100%" and ends at "0 0" when data-show is added
    if (currentTranslate && currentTranslate !== "none") {
      // Parse "0px Ypx" or "0 Y%" format
      const match = currentTranslate.match(/^0(?:px)?\s+(-?[\d.]+)(px|%)$/);
      if (match && match[1] && match[2]) {
        const value = parseFloat(match[1]);
        const unit = match[2];
        // If not at final position (0), animation is in progress
        if (Math.abs(value) > 0.1) {
          translateState = {
            from: currentTranslate,
            progress: unit === "%" ? (100 - Math.abs(value)) / 100 : 0,
          };
        }
      }
    }
  }

  // Perform the move
  if (referenceNode) {
    parent.insertBefore(element, referenceNode);
  } else {
    parent.appendChild(element);
  }

  // If element was mid-animation, continue it using Web Animations API
  if (translateState && hasShowAttribute) {
    // Cancel any existing CSS transition by setting inline style
    element.style.translate = translateState.from;

    // Force reflow to apply the inline style
    void element.offsetWidth;

    // Calculate remaining duration based on progress (original duration is 200ms)
    const remainingDuration = Math.max(50, 200 * (1 - translateState.progress));

    // Use Web Animations API to animate from current position to final
    element.animate(
      [{ translate: translateState.from }, { translate: "0 0" }],
      {
        duration: remainingDuration,
        easing: "cubic-bezier(0.33, 1, 0.68, 1)", // --ease-out-cubic
        fill: "forwards",
      }
    ).onfinish = () => {
      // Clean up inline style after animation completes
      element.style.translate = "";
    };
  }
};

export type NumberFlowInputControlledProps = {
  value: MaybeUndefined<number>;
  defaultValue?: never;
};

export type NumberFlowInputUncontrolledProps = {
  defaultValue?: number;
  value?: never;
};

/**
 * Helper to get decimal and group separators for a given locale.
 */
const getLocaleSeparators = (
  locale?: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale
): { decimal: string; group: string } => {
  const formatter = new Intl.NumberFormat(locale);
  const parts = formatter.formatToParts(1234.5);
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  return { decimal, group };
};

export type NumberFlowInputCommonProps = {
  onChange?: (value: MaybeUndefined<number>) => void;
  autoAddLeadingZero?: boolean;
  maxLength?: number;
  /**
   * Locale for number formatting.
   * If provided, decimal and group separators will be inferred from this locale.
   * The input will accept both '.' and the locale-specific decimal separator.
   */
  locale?: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale;
  /**
   * Whether to format the display using Intl.NumberFormat.
   * If true with locale, uses Intl.NumberFormat(locale).format().
   * If true without locale, uses Intl.NumberFormat().format().
   * Default: false (no formatting)
   */
  format?: boolean;
} & Pick<
  ComponentPropsWithoutRef<"input">,
  | "min"
  | "max"
  | "minLength"
  | "maxLength"
  | "form"
  | "required"
  | "name"
  | "id"
  | "placeholder"
>;

export type NumberFlowInputProps = NumberFlowInputCommonProps &
  (NumberFlowInputControlledProps | NumberFlowInputUncontrolledProps);

export const NumberFlowInput = ({
  value,
  defaultValue,
  onChange,
  autoAddLeadingZero = false,
  placeholder,
  locale,
  format = false,
  ...inputProps
}: NumberFlowInputProps) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const actualValue = isControlled ? value : uncontrolledValue;
  // Raw display value (unformatted, e.g., "1234.56")
  const [displayValue, setDisplayValue] = useState(
    actualValue?.toString() ?? ""
  );
  const [_cursorPosition, setCursorPosition] = useState(0);
  const { maxLength } = inputProps;

  // Get separators for the locale (or default locale if format is true)
  const separators = useMemo(() => {
    if (locale || format) {
      return getLocaleSeparators(locale);
    }
    // Default: standard separators
    return { decimal: ".", group: "," };
  }, [locale, format]);

  // Compute the formatted display value
  const formattedDisplayValue = useMemo(() => {
    const { decimal } = separators;

    // Handle intermediate states where we need to preserve user input
    // Convert internal '.' to locale decimal separator for display
    if (displayValue === "") {
      return "";
    }
    if (displayValue === "-") {
      return "-";
    }
    if (displayValue === ".") {
      return decimal;
    }
    if (displayValue === "-.") {
      return "-" + decimal;
    }

    // Parse the number
    const numericValue = parseFloat(displayValue);
    if (isNaN(numericValue)) {
      // Replace internal '.' with locale decimal for display
      return displayValue.replace(".", decimal);
    }

    // Check for trailing dot or decimal portion being typed
    const hasTrailingDot = displayValue.endsWith(".");
    const dotIndex = displayValue.indexOf(".");
    const decimalPart = dotIndex >= 0 ? displayValue.slice(dotIndex + 1) : "";

    // Check if user typed a leading decimal (e.g., ".5" or "-.5")
    // Only apply formatting if autoAddLeadingZero would convert it
    const hasLeadingDecimal =
      displayValue.startsWith(".") || displayValue.startsWith("-.");
    if (hasLeadingDecimal && !autoAddLeadingZero) {
      // User explicitly typed .5 without autoAddLeadingZero - preserve it
      // Replace internal '.' with locale decimal for display
      return displayValue.replace(".", decimal);
    }

    // If format is false, just convert internal '.' to locale decimal
    if (!format) {
      return displayValue.replace(".", decimal);
    }

    // Format the number using Intl.NumberFormat
    let formatted: string;
    try {
      const formatter = new Intl.NumberFormat(locale);
      formatted = formatter.format(numericValue);

      // If there's a decimal part, we need to preserve the exact decimal digits the user typed
      // The format function may truncate or round decimals, so we restore them
      if (dotIndex >= 0 && decimalPart.length > 0) {
        const formattedDotIndex = formatted.indexOf(decimal);
        if (formattedDotIndex >= 0) {
          // Replace the formatted decimal part with the user's original decimal part
          formatted = formatted.slice(0, formattedDotIndex + 1) + decimalPart;
        } else {
          // Format result has no decimal point but we need one
          formatted += decimal + decimalPart;
        }
      }
    } catch {
      // On error, just convert internal '.' to locale decimal
      formatted = displayValue.replace(".", decimal);
    }

    // Add trailing decimal back if user is typing it
    if (hasTrailingDot && !formatted.includes(decimal)) {
      formatted += decimal;
    }

    return formatted;
  }, [displayValue, format, autoAddLeadingZero, separators, locale]);

  // Track previous formatted value for change detection
  const prevFormattedValueRef = useRef(formattedDisplayValue);

  // Undo/Redo history - stores cursor position before and after each change
  const historyRef = useRef<
    Array<{
      text: string;
      cursorPosBefore: number; // Cursor position before the change (for undo)
      cursorPosAfter: number; // Cursor position after the change (for redo)
      value: MaybeUndefined<number>;
    }>
  >([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  // Track if we should prevent the next input event (for leading 0 bug)
  const shouldPreventInputRef = useRef(false);
  const preventInputCursorPosRef = useRef(0);

  // Track ResizeObservers for digits with barrel wheel animations
  const resizeObserversRef = useRef<Map<number, ResizeObserver>>(new Map());

  // Helper to check if a character is a "raw" character (digit, decimal, or minus)
  const isRawChar = useCallback(
    (char: string | undefined): boolean => {
      if (!char) {
        return false;
      }
      const { decimal } = separators;
      // Include locale decimal separator as a raw character
      return /[\d.\-]/.test(char) || char === decimal;
    },
    [separators]
  );

  // Helper to map a raw index to a formatted index
  // Raw: "1234.56" -> Formatted: "1,234.56"
  // Raw index 0 (1) -> Formatted index 0
  // Raw index 1 (2) -> Formatted index 2 (after comma)
  const mapRawToFormattedIndex = useCallback(
    (rawValue: string, formattedValue: string, rawIndex: number): number => {
      if (rawIndex <= 0) {
        return 0;
      }
      if (rawIndex >= rawValue.length) {
        return formattedValue.length;
      }

      // Count how many raw characters we've seen to find the rawIndex'th one
      let rawCount = 0;

      for (
        let formattedIndex = 0;
        formattedIndex < formattedValue.length;
        formattedIndex++
      ) {
        const formattedChar = formattedValue[formattedIndex];
        // Check if this is a raw character (digit, decimal, minus) vs format character (comma, space, etc.)
        if (isRawChar(formattedChar)) {
          if (rawCount === rawIndex) {
            // Found the rawIndex'th raw character
            return formattedIndex;
          }
          rawCount++;
        }
      }

      return formattedValue.length;
    },
    [isRawChar]
  );

  // Helper to map a formatted index to a raw index
  const mapFormattedToRawIndex = useCallback(
    (
      rawValue: string,
      formattedValue: string,
      formattedIndex: number
    ): number => {
      if (formattedIndex <= 0) {
        return 0;
      }
      if (formattedIndex >= formattedValue.length) {
        return rawValue.length;
      }

      let rawIndex = 0;
      for (let i = 0; i < formattedIndex && i < formattedValue.length; i++) {
        const char = formattedValue[i];
        if (isRawChar(char)) {
          rawIndex++;
        }
      }
      return Math.min(rawIndex, rawValue.length);
    },
    [isRawChar]
  );

  // Helper to check if a character at a formatted index is a separator (not digit, decimal, or minus)
  const _isSeparatorChar = useCallback(
    (char: string | undefined): boolean => {
      if (!char) {
        return false;
      }
      // Check against locale decimal separator and standard characters
      const { decimal } = separators;
      if (char === decimal || char === "." || char === "-" || /\d/.test(char)) {
        return false;
      }
      return true;
    },
    [separators]
  );

  // Helper to format a raw value string (raw always uses '.' as decimal)
  const formatRawValue = useCallback(
    (rawValue: string): string => {
      const { decimal } = separators;

      // Handle intermediate states
      if (rawValue === "") {
        return "";
      }
      if (rawValue === "-") {
        return "-";
      }
      if (rawValue === ".") {
        return decimal;
      }
      if (rawValue === "-.") {
        return "-" + decimal;
      }

      const numericValue = parseFloat(rawValue);
      if (isNaN(numericValue)) {
        // Replace internal '.' with locale decimal for display
        return rawValue.replace(".", decimal);
      }

      // Check if user typed a leading decimal (e.g., ".5" or "-.5")
      // Only apply formatting if autoAddLeadingZero would convert it
      const hasLeadingDecimal =
        rawValue.startsWith(".") || rawValue.startsWith("-.");
      if (hasLeadingDecimal && !autoAddLeadingZero) {
        // User explicitly typed .5 without autoAddLeadingZero - preserve it
        return rawValue.replace(".", decimal);
      }

      // If format is false, just convert internal '.' to locale decimal
      if (!format) {
        return rawValue.replace(".", decimal);
      }

      const hasTrailingDot = rawValue.endsWith(".");
      const dotIndex = rawValue.indexOf(".");
      const decimalPart = dotIndex >= 0 ? rawValue.slice(dotIndex + 1) : "";

      let formatted: string;
      try {
        const formatter = new Intl.NumberFormat(locale);
        formatted = formatter.format(numericValue);

        // If there's a decimal part, we need to preserve the exact decimal digits the user typed
        // The format function may truncate or round decimals, so we restore them
        if (dotIndex >= 0 && decimalPart.length > 0) {
          const formattedDotIndex = formatted.indexOf(decimal);
          if (formattedDotIndex >= 0) {
            // Replace the formatted decimal part with the user's original decimal part
            formatted = formatted.slice(0, formattedDotIndex + 1) + decimalPart;
          } else {
            // Format result has no decimal point but we need one
            formatted += decimal + decimalPart;
          }
        }
      } catch {
        // On error, just convert internal '.' to locale decimal
        formatted = rawValue.replace(".", decimal);
      }

      if (hasTrailingDot && !formatted.includes(decimal)) {
        formatted += decimal;
      }

      return formatted;
    },
    [format, autoAddLeadingZero, separators, locale]
  );

  const addToHistory = useCallback(
    (
      text: string,
      cursorPosBefore: number,
      cursorPosAfter: number,
      value: MaybeUndefined<number>
    ) => {
      historyRef.current = historyRef.current.slice(
        0,
        historyIndexRef.current + 1
      );
      historyRef.current.push({ text, cursorPosBefore, cursorPosAfter, value });
      historyIndexRef.current = historyRef.current.length - 1;
      if (historyRef.current.length > 50) {
        historyRef.current.shift();
        historyIndexRef.current--;
      }
    },
    []
  );

  // Helper function to reposition all existing barrel wheels
  const repositionAllBarrelWheels = useCallback(() => {
    if (!spanRef.current?.parentElement) {
      return;
    }

    const parentContainer = spanRef.current.parentElement;
    const existingBarrelWheels = parentContainer.querySelectorAll(
      `[data-char-index].${styles.barrel_wheel || ""}`
    );

    if (existingBarrelWheels.length === 0) {
      return;
    }

    // Get all spans in DOM order and calculate their FINAL widths using measureText
    // This is needed because some spans may be animating their width from 0
    const allSpans = Array.from(
      spanRef.current.querySelectorAll("[data-char-index]")
    ) as HTMLElement[];

    // Sort by data-char-index to ensure correct order
    allSpans.sort((a, b) => {
      const aIndex = parseInt(a.getAttribute("data-char-index") ?? "0", 10);
      const bIndex = parseInt(b.getAttribute("data-char-index") ?? "0", 10);
      return aIndex - bIndex;
    });

    // Calculate final widths for all spans using measureText
    const spanWidths = new Map<number, number>();
    allSpans.forEach((span) => {
      const index = parseInt(span.getAttribute("data-char-index") ?? "-1", 10);
      if (index >= 0 && span.textContent) {
        // Use measureText to get the accurate final width
        const finalWidth = measureText(span.textContent, span);
        spanWidths.set(index, finalWidth);
      }
    });

    // Get the container's position for relative positioning
    const containerRect = spanRef.current.getBoundingClientRect();
    const parentRect = parentContainer.getBoundingClientRect();

    existingBarrelWheels.forEach((wheel) => {
      const wheelEl = wheel as HTMLElement;
      const indexStr = wheelEl.getAttribute("data-char-index");
      if (indexStr !== null) {
        const barrelIndex = parseInt(indexStr, 10);
        if (!isNaN(barrelIndex) && barrelIndex >= 0 && spanRef.current) {
          const charSpan = spanRef.current.querySelector(
            `[data-char-index="${barrelIndex}"]`
          ) as HTMLElement | null;

          if (charSpan) {
            if (!isTransparent(charSpan)) {
              charSpan.style.color = "transparent";
            }

            // Calculate the left position by summing widths of all preceding spans
            let leftPosition = containerRect.left - parentRect.left;
            for (let i = 0; i < barrelIndex; i++) {
              const width = spanWidths.get(i);
              if (width !== undefined) {
                leftPosition += width;
              }
            }

            // Get the barrel wheel span's dimensions
            const barrelSpanWidth = spanWidths.get(barrelIndex) ?? 0;
            const barrelSpanHeight = charSpan.getBoundingClientRect().height;

            // Position the barrel wheel
            wheelEl.style.left = `${leftPosition}px`;
            wheelEl.style.top = `${containerRect.top - parentRect.top}px`;
            wheelEl.style.width = `${barrelSpanWidth}px`;
            wheelEl.style.height = `${barrelSpanHeight}px`;
          }
        }
      }
    });
  }, []);

  // Helper function to remove barrel wheels at specific indices
  const removeBarrelWheelsAtIndices = useCallback((indices: number[]) => {
    if (!spanRef.current) {
      return;
    }
    const parentContainer = spanRef.current.parentElement;
    if (!parentContainer) {
      return;
    }

    indices.forEach((index) => {
      // Clean up ResizeObserver for this index
      const observer = resizeObserversRef.current.get(index);
      if (observer) {
        observer.disconnect();
        resizeObserversRef.current.delete(index);
      }

      const charSpan = spanRef.current?.querySelector(
        `[data-char-index="${index}"]`
      ) as HTMLElement | null;
      if (charSpan) {
        if (charSpan.hasAttribute("data-width-animate")) {
          cleanupWidthAnimation(charSpan);
        }
        if (isTransparent(charSpan)) {
          charSpan.style.color = "";
        }
      }

      const barrelWheel = parentContainer.querySelector(
        `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
      ) as HTMLElement | null;
      if (barrelWheel) {
        barrelWheel.remove();

        // After removing barrel wheel, do a final pass to ensure the span at THIS index is not still transparent
        // IMPORTANT: Only check the span at the specific index, not other spans with the same final digit
        // This prevents conflicts when multiple barrel wheels have the same final digit
        if (spanRef.current) {
          const spanAtIndex = spanRef.current.querySelector(
            `[data-char-index="${index}"]`
          ) as HTMLElement | null;

          if (spanAtIndex) {
            const hasBarrelWheel = parentContainer.querySelector(
              `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
            );
            if (isTransparent(spanAtIndex) && !hasBarrelWheel) {
              spanAtIndex.style.color = "";
            }
          }
        }
      }
    });
  }, []);

  const updateValue = useCallback(
    (
      newText: string,
      newCursorPos: number,
      selectionStart: number,
      selectionEnd: number,
      skipHistory = false
    ) => {
      const oldText = displayValue;
      const rawCleaned = newText.replace(/[^\d.-]/g, "");
      const { cleanedText: baseCleanedText, leadingZerosRemoved } = cleanText(
        rawCleaned,
        autoAddLeadingZero
      );
      const cleanedText = baseCleanedText;

      if (leadingZerosRemoved > 0 && newCursorPos > 0) {
        newCursorPos = Math.max(0, newCursorPos - leadingZerosRemoved);
      }

      if (autoAddLeadingZero) {
        // Check rawCleaned (before leading zero was added) to detect if we added a leading zero
        if (rawCleaned.startsWith(".")) {
          newCursorPos += 1;
        } else if (rawCleaned.startsWith("-.")) {
          newCursorPos += 1;
        }
      }

      const numberValue = parseNumberValue(cleanedText);

      onChange?.(numberValue);
      setUncontrolledValue(numberValue);
      setDisplayValue(cleanedText);
      setCursorPosition(newCursorPos);

      if (!skipHistory && !isUndoRedoRef.current) {
        addToHistory(cleanedText, selectionEnd, newCursorPos, numberValue);
      }

      // Update DOM with animation
      if (spanRef.current) {
        // Special handling for leading zero removal and decimal point deletion
        let adjustedOldText = oldText;
        let adjustedSelectionStart = selectionStart;
        let adjustedSelectionEnd = selectionEnd;
        let adjustedNewCursorPos = newCursorPos;

        // Check if we deleted a decimal point that was after a leading zero (e.g., "0.122" -> "122")
        const deletedDecimalAfterZero =
          oldText.startsWith("0.") &&
          !cleanedText.startsWith("0") &&
          cleanedText.length > 0 &&
          oldText.length > cleanedText.length &&
          oldText.includes(".") &&
          !cleanedText.includes(".");

        // Check if we're replacing a single leading "0" with a non-zero digit (e.g., "0" -> "1")
        const replacedLeadingZero =
          oldText === "0" &&
          cleanedText.length > 0 &&
          cleanedText[0] !== "0" &&
          !cleanedText.startsWith("0.");

        if (deletedDecimalAfterZero) {
          // When deleting "." from "0.122", we get "0122" which becomes "122"
          // We want all digits in "122" to have data-show, so we compare "" with "122"
          adjustedOldText = "";
          adjustedSelectionStart = 0;
          adjustedSelectionEnd = 0;
          adjustedNewCursorPos = cleanedText.length;
        } else if (replacedLeadingZero) {
          // Special case: "0" -> "1" (or any non-zero digit)
          // We want to treat this as if we're starting from scratch
          adjustedOldText = "";
          adjustedSelectionStart = 0;
          adjustedSelectionEnd = 0;
          adjustedNewCursorPos = cleanedText.length;
        } else if (leadingZerosRemoved > 0 && oldText.length > 0) {
          // If we removed leading zeros, adjust the oldText comparison
          if (
            oldText.startsWith("0") &&
            oldText.length > 1 &&
            oldText[1] !== "."
          ) {
            // More general case: if oldText was "0123" and we typed "4" to get "01234" which became "1234",
            // we need to adjust the comparison
            const oldWithoutLeadingZeros = oldText.replace(/^0+/, "");
            if (
              oldWithoutLeadingZeros ===
              cleanedText.slice(0, oldWithoutLeadingZeros.length)
            ) {
              // The old text (without leading zeros) matches the start of new text
              // This means we just added characters at the end
              adjustedOldText = oldWithoutLeadingZeros;
              // Adjust selection and cursor positions to account for removed leading zeros
              adjustedSelectionStart = Math.max(
                0,
                selectionStart - leadingZerosRemoved
              );
              adjustedSelectionEnd = Math.max(
                0,
                selectionEnd - leadingZerosRemoved
              );
              adjustedNewCursorPos = Math.max(
                0,
                newCursorPos - leadingZerosRemoved
              );
            }
          }
        }
        const changes = getChanges(
          adjustedOldText,
          cleanedText,
          adjustedSelectionStart,
          adjustedSelectionEnd,
          adjustedNewCursorPos
        );

        // Compute formatted versions for display
        const oldFormattedText = prevFormattedValueRef.current;
        const newFormattedText = formatRawValue(cleanedText);
        const formattedChanges = getFormattedChanges(
          oldFormattedText,
          newFormattedText,
          adjustedNewCursorPos,
          adjustedSelectionStart,
          adjustedOldText.length
        );

        // Detect position changes for x-position animation (used later)
        const positionChanges = getPositionChanges(
          oldFormattedText,
          newFormattedText
        );

        // For FLIP animation: capture old positions BEFORE any DOM changes
        // Store by character + formatted index
        const oldPositions = new Map<string, { x: number; width: number }>();
        if (spanRef.current) {
          const containerRect = spanRef.current.getBoundingClientRect();
          for (let i = 0; i < oldFormattedText.length; i++) {
            const char = oldFormattedText[i];
            // Find the span for this index
            const span = spanRef.current.querySelector(
              `[data-char-index="${i}"]`
            ) as HTMLElement | null;
            // Verify span exists and content matches (DOM might be out of sync)
            if (span && char !== undefined && span.textContent === char) {
              const rect = span.getBoundingClientRect();
              // Key: char + its position in the old formatted string
              const key = `${char}@${i}`;
              oldPositions.set(key, {
                x: rect.left - containerRect.left,
                width: rect.width,
              });
            }
          }
        }

        // Update the previous formatted value ref for next comparison
        // Note: oldFormattedText was captured at line ~692 BEFORE this update,
        // so barrel wheel and span shifting logic will use the correct old value
        prevFormattedValueRef.current = newFormattedText;

        // Update barrel wheel indices if characters were inserted or deleted before them
        // IMPORTANT: Barrel wheel indices are FORMATTED indices (include separators)
        // We need to map raw selection positions to formatted positions for correct comparison
        if (spanRef.current?.parentElement) {
          const parentContainer = spanRef.current.parentElement;
          const existingBarrelWheels = parentContainer.querySelectorAll(
            `[data-char-index].${styles.barrel_wheel || ""}`
          );
          // Note: oldFormattedText is captured above before updating prevFormattedValueRef

          existingBarrelWheels.forEach((wheel) => {
            const wheelEl = wheel as HTMLElement;
            const oldFormattedIndexStr =
              wheelEl.getAttribute("data-char-index");
            const finalDigitStr = wheelEl.getAttribute("data-final-digit");
            if (oldFormattedIndexStr !== null) {
              const oldFormattedIndex = parseInt(oldFormattedIndexStr, 10);
              if (!isNaN(oldFormattedIndex) && oldFormattedIndex >= 0) {
                // Convert barrel wheel's formatted index to raw index
                const barrelWheelRawIndex = mapFormattedToRawIndex(
                  adjustedOldText,
                  oldFormattedText,
                  oldFormattedIndex
                );

                const lengthDiff = cleanedText.length - adjustedOldText.length;
                // hadSelection is true when user had text selected (replacement creates barrel wheel at new position)
                // For single-char insertions, adjustedSelectionStart === adjustedSelectionEnd
                const hadUserSelection =
                  adjustedSelectionStart < adjustedSelectionEnd &&
                  lengthDiff >= 0; // Only for insertions/replacements, not deletions

                if (
                  !hadUserSelection &&
                  lengthDiff > 0 &&
                  adjustedSelectionStart <= barrelWheelRawIndex
                ) {
                  // Characters were inserted at or before this index, so shift it forward
                  // Calculate new raw index
                  const numInserted =
                    adjustedNewCursorPos - adjustedSelectionStart;
                  const newRawIndex = barrelWheelRawIndex + numInserted;
                  // Map back to formatted index
                  const newFormattedIndex = mapRawToFormattedIndex(
                    cleanedText,
                    newFormattedText,
                    newRawIndex
                  );

                  wheelEl.setAttribute(
                    "data-char-index",
                    newFormattedIndex.toString()
                  );

                  const observer =
                    resizeObserversRef.current.get(oldFormattedIndex);
                  if (observer) {
                    resizeObserversRef.current.delete(oldFormattedIndex);
                    resizeObserversRef.current.set(newFormattedIndex, observer);
                  }

                  if (finalDigitStr && spanRef.current) {
                    const oldSpan = spanRef.current.querySelector(
                      `[data-char-index="${oldFormattedIndex}"]`
                    ) as HTMLElement | null;
                    if (oldSpan && oldSpan.textContent === finalDigitStr) {
                      oldSpan.setAttribute(
                        "data-char-index",
                        newFormattedIndex.toString()
                      );
                    }
                  }
                } else if (
                  lengthDiff < 0 &&
                  adjustedSelectionStart < barrelWheelRawIndex
                ) {
                  // Characters were deleted before this index, so shift it backward
                  // Note: No hadUserSelection check for deletions - always shift barrel wheels after deletion point
                  const numDeleted =
                    adjustedSelectionEnd - adjustedSelectionStart;
                  const newRawIndex = Math.max(
                    0,
                    barrelWheelRawIndex - numDeleted
                  );

                  // Only update if the new index is valid and the barrel wheel should still exist
                  // Also ensure the barrel wheel is not in the deletion range
                  if (
                    newRawIndex < cleanedText.length &&
                    barrelWheelRawIndex >= adjustedSelectionEnd
                  ) {
                    // Map back to formatted index
                    const newFormattedIndex = mapRawToFormattedIndex(
                      cleanedText,
                      newFormattedText,
                      newRawIndex
                    );

                    wheelEl.setAttribute(
                      "data-char-index",
                      newFormattedIndex.toString()
                    );

                    const observer =
                      resizeObserversRef.current.get(oldFormattedIndex);
                    if (observer) {
                      resizeObserversRef.current.delete(oldFormattedIndex);
                      resizeObserversRef.current.set(
                        newFormattedIndex,
                        observer
                      );
                    }

                    if (finalDigitStr && spanRef.current) {
                      // Find the span that matches the final digit - it might still be at oldIndex
                      // or it might have already been shifted
                      const oldSpan = spanRef.current.querySelector(
                        `[data-char-index="${oldFormattedIndex}"]`
                      ) as HTMLElement | null;
                      if (oldSpan && oldSpan.textContent === finalDigitStr) {
                        oldSpan.setAttribute(
                          "data-char-index",
                          newFormattedIndex.toString()
                        );
                      } else {
                        // Also check if there's a span at the new index that matches
                        const newSpan = spanRef.current.querySelector(
                          `[data-char-index="${newFormattedIndex}"]`
                        ) as HTMLElement | null;
                        if (newSpan && newSpan.textContent === finalDigitStr) {
                          // Span is already at the correct index, just ensure it's marked correctly
                        } else {
                          // Search for any transparent span with the final digit
                          const allSpans =
                            spanRef.current.querySelectorAll(
                              "[data-char-index]"
                            );
                          Array.from(allSpans).forEach((span) => {
                            const spanEl = span as HTMLElement;
                            if (
                              spanEl.textContent === finalDigitStr &&
                              isTransparent(spanEl)
                            ) {
                              spanEl.setAttribute(
                                "data-char-index",
                                newFormattedIndex.toString()
                              );
                            }
                          });
                        }
                      }
                    }
                  } else {
                    // Barrel wheel is now out of bounds, remove it
                    const observer =
                      resizeObserversRef.current.get(oldFormattedIndex);
                    if (observer) {
                      observer.disconnect();
                      resizeObserversRef.current.delete(oldFormattedIndex);
                    }
                    wheelEl.remove();
                  }
                }
              }
            }
          });
        }

        // Incrementally update DOM instead of full reconstruction
        if (spanRef.current) {
          // First, update indices of existing spans that need to shift due to insertions or deletions
          // This handles the case where characters are inserted/deleted before existing spans
          // Do this BEFORE collecting spans by index, so the map is correct
          // IMPORTANT: Span indices are FORMATTED (include separators), but selection positions are RAW
          // We need to map between them correctly
          // Note: oldFormattedText is captured at the start of updateValue, before prevFormattedValueRef update
          const lengthDiff = cleanedText.length - adjustedOldText.length;
          // For insertions, hadSelection means user had text selected (replacement scenario)
          // For deletions, we always want to shift spans, so don't check hadSelection
          const hadSelectionForInsert =
            adjustedSelectionStart < adjustedSelectionEnd && lengthDiff > 0;

          if (lengthDiff !== 0 && (lengthDiff < 0 || !hadSelectionForInsert)) {
            // Collect all spans first
            const allSpans: HTMLElement[] = [];
            let nodeToUpdate = spanRef.current.firstChild;
            while (nodeToUpdate) {
              if (
                nodeToUpdate instanceof HTMLElement &&
                nodeToUpdate.hasAttribute("data-char-index")
              ) {
                allSpans.push(nodeToUpdate);
              }
              nodeToUpdate = nodeToUpdate.nextSibling;
            }
            // Update indices of spans that need to shift
            allSpans.forEach((span) => {
              const oldFormattedIndexStr = span.getAttribute("data-char-index");
              if (oldFormattedIndexStr !== null) {
                const oldFormattedIndex = parseInt(oldFormattedIndexStr, 10);
                if (!isNaN(oldFormattedIndex) && oldFormattedIndex >= 0) {
                  // Convert span's formatted index to raw index
                  const spanRawIndex = mapFormattedToRawIndex(
                    adjustedOldText,
                    oldFormattedText,
                    oldFormattedIndex
                  );

                  if (lengthDiff > 0) {
                    // Characters were inserted - shift spans at and after the insertion point
                    if (
                      spanRawIndex >= adjustedSelectionStart &&
                      spanRawIndex < adjustedOldText.length
                    ) {
                      const numInserted =
                        adjustedNewCursorPos - adjustedSelectionStart;
                      const newRawIndex = spanRawIndex + numInserted;
                      if (newRawIndex < cleanedText.length) {
                        const newFormattedIndex = mapRawToFormattedIndex(
                          cleanedText,
                          newFormattedText,
                          newRawIndex
                        );
                        span.setAttribute(
                          "data-char-index",
                          newFormattedIndex.toString()
                        );
                      }
                    }
                  } else if (lengthDiff < 0) {
                    // Characters were deleted - shift spans after the deletion point backward
                    const numDeleted =
                      adjustedSelectionEnd - adjustedSelectionStart;
                    if (
                      spanRawIndex >= adjustedSelectionStart &&
                      spanRawIndex < adjustedSelectionEnd
                    ) {
                      // Span is in the deletion range - it will be removed by cleanup logic
                    } else if (spanRawIndex >= adjustedSelectionEnd) {
                      // Span is after the deletion point, shift it backward
                      const newRawIndex = Math.max(
                        0,
                        spanRawIndex - numDeleted
                      );
                      if (newRawIndex < cleanedText.length) {
                        const newFormattedIndex = mapRawToFormattedIndex(
                          cleanedText,
                          newFormattedText,
                          newRawIndex
                        );
                        span.setAttribute(
                          "data-char-index",
                          newFormattedIndex.toString()
                        );
                      }
                    }
                  }
                }
              }
            });
          }

          // Get all existing spans mapped by index (after updating indices)
          // Also track transparent spans separately to handle them specially
          // Track visible spans by content to find them when indices shift
          const existingSpansByIndex = new Map<number, HTMLElement>();
          const allExistingSpans: HTMLElement[] = [];
          const transparentSpans = new Map<number, HTMLElement>();
          const transparentSpansByContent = new Map<string, HTMLElement>();
          const visibleSpansByContent = new Map<string, HTMLElement[]>();
          const textNodesToRemove: Node[] = [];
          let node = spanRef.current.firstChild;
          while (node) {
            if (
              node instanceof HTMLElement &&
              node.hasAttribute("data-char-index")
            ) {
              const index = parseInt(
                node.getAttribute("data-char-index") ?? "-1",
                10
              );
              if (index >= 0) {
                const isTransparentSpan = isTransparent(node);
                if (isTransparentSpan) {
                  transparentSpans.set(index, node);
                  const content = node.textContent ?? "";
                  if (!transparentSpansByContent.has(content)) {
                    transparentSpansByContent.set(content, node);
                  }
                } else {
                  // Track visible spans by content for fallback lookup
                  const content = node.textContent ?? "";
                  if (!visibleSpansByContent.has(content)) {
                    visibleSpansByContent.set(content, []);
                  }
                  visibleSpansByContent.get(content)!.push(node);
                }
                if (!existingSpansByIndex.has(index) || !isTransparentSpan) {
                  existingSpansByIndex.set(index, node);
                }
                allExistingSpans.push(node);
              }
            } else if (node.nodeType === Node.TEXT_NODE) {
              textNodesToRemove.push(node);
            }
            node = node.nextSibling;
          }

          // Remove any stray text nodes (from undo/redo or other operations)
          textNodesToRemove.forEach((textNode) => {
            if (textNode.parentNode) {
              textNode.parentNode.removeChild(textNode);
            }
          });

          // Track which spans we've used
          const usedSpans = new Set<HTMLElement>();
          const newSpans: HTMLElement[] = [];
          let referenceNode: Node | null = null;

          // Build new structure, reusing existing spans when possible
          // Get parent container once for barrel wheel checks
          const parentContainer = spanRef.current.parentElement;

          // Use formatted text for display (includes thousand separators, etc.)
          for (let i = 0; i < newFormattedText.length; i++) {
            const char = newFormattedText[i];
            const isUnchanged = formattedChanges.unchangedIndices.has(i);
            // For barrel wheel, we need to map from formatted index to raw index
            const rawIndex = mapFormattedToRawIndex(
              cleanedText,
              newFormattedText,
              i
            );
            const barrelWheel = changes.barrelWheelIndices.get(rawIndex);

            // Check if there's a barrel wheel in DOM for this index (indices may have shifted)
            const hasBarrelWheelInDOM = parentContainer?.querySelector(
              `[data-char-index="${i}"].${styles.barrel_wheel || ""}`
            );

            // Also check if there's a transparent span at this index that indicates a barrel wheel
            // (the barrel wheel might have shifted and the span index was updated but barrel wheel query might miss it)
            let hasTransparentSpanWithBarrelWheel = false;
            const spanAtI = existingSpansByIndex.get(i);
            if (spanAtI && isTransparent(spanAtI)) {
              // Check if there's a barrel wheel anywhere that might be associated with this span
              const allBarrelWheels = parentContainer?.querySelectorAll(
                `[data-char-index].${styles.barrel_wheel || ""}`
              );
              if (allBarrelWheels) {
                // Check if any barrel wheel's final digit matches this span's content
                Array.from(allBarrelWheels).forEach((wheel) => {
                  const wheelEl = wheel as HTMLElement;
                  const finalDigit = wheelEl.getAttribute("data-final-digit");
                  if (finalDigit === char) {
                    hasTransparentSpanWithBarrelWheel = true;
                  }
                });
              }
            }

            const hasBarrelWheel =
              barrelWheel !== undefined ||
              !!hasBarrelWheelInDOM ||
              hasTransparentSpanWithBarrelWheel;

            // Try to reuse existing span at this index
            let span = existingSpansByIndex.get(i);
            let shouldReuse = false;

            // Only reuse if this index is marked as unchanged (not added)
            // New characters should always get new spans to trigger animations
            const isAdded = formattedChanges.addedIndices.has(i);
            const isUnchangedIndex = formattedChanges.unchangedIndices.has(i);

            // If no exact index match, try to find by content for unchanged characters
            // This handles the case where indices shifted due to separator insertion
            if (
              (!span || span.textContent !== char) &&
              char &&
              !isAdded &&
              isUnchangedIndex
            ) {
              const candidates = visibleSpansByContent.get(char) ?? [];
              for (const candidate of candidates) {
                if (
                  !usedSpans.has(candidate) &&
                  candidate.textContent === char
                ) {
                  span = candidate;
                  break;
                }
              }
            }

            if (
              span &&
              span.textContent === char &&
              !usedSpans.has(span) &&
              !isAdded &&
              isUnchangedIndex
            ) {
              // Check if span is in approximately the right position
              // (within 2 positions is acceptable to avoid unnecessary reordering)
              let currentPos = 0;
              let node: ChildNode | null = spanRef.current.firstChild;
              while (node && node !== span) {
                if (
                  node instanceof HTMLElement &&
                  node.hasAttribute("data-char-index")
                ) {
                  currentPos++;
                }
                node = node.nextSibling;
              }

              if (Math.abs(currentPos - i) <= 2) {
                shouldReuse = true;
              }
            }

            if (shouldReuse && span) {
              // Reuse existing span - ensure textContent matches (defensive check)
              if (span.textContent !== char) {
                span.textContent = char ?? "";
              }

              // Update data-char-index to new position
              span.setAttribute("data-char-index", i.toString());

              // Update attributes if needed
              const shouldHaveFlow = !barrelWheel;
              const shouldHaveShow = isUnchanged;
              const hasFlow = span.hasAttribute("data-flow");
              const hasShow = span.hasAttribute("data-show");

              if (shouldHaveFlow && !hasFlow) {
                span.setAttribute("data-flow", "");
              } else if (!shouldHaveFlow && hasFlow) {
                span.removeAttribute("data-flow");
              }

              if (shouldHaveShow && !hasShow) {
                span.setAttribute("data-show", "");
              } else if (!shouldHaveShow && hasShow) {
                span.removeAttribute("data-show");
              }

              usedSpans.add(span);
              // Move to correct position if needed, preserving any ongoing animations
              if (referenceNode) {
                const nextSibling = referenceNode.nextSibling;
                if (span.previousSibling !== referenceNode && nextSibling) {
                  moveElementPreservingAnimation(
                    span,
                    spanRef.current,
                    nextSibling
                  );
                } else if (
                  !nextSibling &&
                  span.parentNode !== spanRef.current
                ) {
                  moveElementPreservingAnimation(span, spanRef.current, null);
                }
              }
              referenceNode = span;
            } else {
              // Check if there's an existing span that's currently animating (barrel wheel or width)
              // First check if there's a transparent span at this index (might have shifted)
              let existingSpan = existingSpansByIndex.get(i);
              // If no span at this index, check if there's a transparent span that shifted here
              if (!existingSpan && transparentSpans.has(i)) {
                existingSpan = transparentSpans.get(i)!;
              }
              // Also check all transparent spans to see if any match this character and should be at this index
              // This handles the case where a transparent span shifted but wasn't found in the map
              if (!existingSpan || !isTransparent(existingSpan)) {
                // First, check if there's a transparent span with matching content
                const matchingTransparentSpan = char
                  ? transparentSpansByContent.get(char)
                  : undefined;
                if (
                  matchingTransparentSpan &&
                  !usedSpans.has(matchingTransparentSpan) &&
                  isTransparent(matchingTransparentSpan)
                ) {
                  // Check if there's a barrel wheel that matches this span
                  const allBarrelWheels = parentContainer?.querySelectorAll(
                    `[data-char-index].${styles.barrel_wheel || ""}`
                  );
                  if (allBarrelWheels) {
                    for (const wheel of Array.from(allBarrelWheels)) {
                      const wheelEl = wheel as HTMLElement;
                      const wheelIndex = parseInt(
                        wheelEl.getAttribute("data-char-index") ?? "-1",
                        10
                      );
                      const finalDigit =
                        wheelEl.getAttribute("data-final-digit");
                      if (finalDigit === char) {
                        // This transparent span is associated with a barrel wheel
                        // If the barrel wheel is at index i, or if it should be at i (was shifted)
                        if (wheelIndex === i) {
                          existingSpan = matchingTransparentSpan;
                          matchingTransparentSpan.setAttribute(
                            "data-char-index",
                            i.toString()
                          );
                          break;
                        } else if (wheelIndex > i && lengthDiff < 0) {
                          // Barrel wheel was shifted but might not be at i yet - update both
                          existingSpan = matchingTransparentSpan;
                          matchingTransparentSpan.setAttribute(
                            "data-char-index",
                            i.toString()
                          );
                          wheelEl.setAttribute("data-char-index", i.toString());
                          const observer =
                            resizeObserversRef.current.get(wheelIndex);
                          if (observer) {
                            resizeObserversRef.current.delete(wheelIndex);
                            resizeObserversRef.current.set(i, observer);
                          }
                          break;
                        }
                      }
                    }
                  }
                }
              }
              const hasWidthAnimation =
                existingSpan?.hasAttribute("data-width-animate");
              // Check if span is hidden (indicates barrel wheel animation in progress)
              const isHidden =
                existingSpan?.style.color === "transparent" ||
                existingSpan?.style.color === "rgba(0, 0, 0, 0)" ||
                (existingSpan &&
                  window.getComputedStyle(existingSpan).color ===
                    "rgba(0, 0, 0, 0)");

              // Don't reuse span if there's a barrel wheel animation for this index
              // The barrel wheel code needs to set up width animation, so let it handle the span
              // Only reuse if it's a width animation without barrel wheel (width animation cleanup)
              const shouldReuseSpan =
                !hasBarrelWheel &&
                hasWidthAnimation &&
                !isHidden &&
                existingSpan &&
                !usedSpans.has(existingSpan);

              // IMPORTANT: If there's a transparent span at this index, it's part of an ongoing barrel wheel
              // We MUST reuse it, even if changes.barrelWheelIndices doesn't have this index
              // (because the barrel wheel's index may have shifted)
              // Also check if there's a barrel wheel anywhere that matches this character
              let hasMatchingBarrelWheel =
                hasBarrelWheel || hasBarrelWheelInDOM;
              if (!hasMatchingBarrelWheel && isHidden && existingSpan) {
                // Check all barrel wheels to see if any match this character
                const allBarrelWheels = parentContainer?.querySelectorAll(
                  `[data-char-index].${styles.barrel_wheel || ""}`
                );
                if (allBarrelWheels) {
                  for (const wheel of Array.from(allBarrelWheels)) {
                    const wheelEl = wheel as HTMLElement;
                    const finalDigit = wheelEl.getAttribute("data-final-digit");
                    if (finalDigit === char) {
                      hasMatchingBarrelWheel = true;
                      break;
                    }
                  }
                }
              }

              const shouldReuseTransparentSpan =
                isHidden &&
                existingSpan &&
                !usedSpans.has(existingSpan) &&
                (hasBarrelWheel ||
                  hasBarrelWheelInDOM ||
                  hasMatchingBarrelWheel);

              // If there's a transparent span (barrel wheel animation), reuse it
              if (shouldReuseTransparentSpan && existingSpan) {
                // Reuse the transparent span - it's part of an ongoing barrel wheel animation
                span = existingSpan;
                // Update textContent if needed (should match the final digit)
                if (span.textContent !== char) {
                  span.textContent = char ?? "";
                }
                // Ensure data-char-index is correct
                span.setAttribute("data-char-index", i.toString());
                // Keep it transparent (barrel wheel is still animating)
                span.style.color = "transparent";
                // Don't set data-flow (barrel wheel handles it)
                span.removeAttribute("data-flow");
                if (isUnchanged) {
                  span.setAttribute("data-show", "");
                } else {
                  span.removeAttribute("data-show");
                }
                usedSpans.add(span);
                // Ensure it's in the correct position, preserving any ongoing animations
                if (referenceNode) {
                  const nextSibling = referenceNode.nextSibling;
                  if (span.previousSibling !== referenceNode && nextSibling) {
                    moveElementPreservingAnimation(
                      span,
                      spanRef.current,
                      nextSibling
                    );
                  } else if (
                    !nextSibling &&
                    span.parentNode !== spanRef.current
                  ) {
                    moveElementPreservingAnimation(span, spanRef.current, null);
                  }
                }
                referenceNode = span;
              } else if (shouldReuseSpan && existingSpan) {
                // If there's an existing span that's animating width (not barrel wheel), update it
                // Update the existing animating span
                span = existingSpan;
                // Update textContent if it changed (shouldn't happen during barrel wheel, but defensive)
                if (span.textContent !== char) {
                  span.textContent = char ?? "";
                }
                // Update data-char-index to ensure it's correct
                span.setAttribute("data-char-index", i.toString());

                // Update attributes
                if (!barrelWheel) {
                  span.setAttribute("data-flow", "");
                } else {
                  span.removeAttribute("data-flow");
                }
                if (isUnchanged) {
                  span.setAttribute("data-show", "");
                } else {
                  span.removeAttribute("data-show");
                }

                usedSpans.add(span);
                // Ensure it's in the correct position, preserving any ongoing animations
                if (referenceNode) {
                  const nextSibling = referenceNode.nextSibling;
                  if (span.previousSibling !== referenceNode && nextSibling) {
                    moveElementPreservingAnimation(
                      span,
                      spanRef.current,
                      nextSibling
                    );
                  } else if (
                    !nextSibling &&
                    span.parentNode !== spanRef.current
                  ) {
                    moveElementPreservingAnimation(span, spanRef.current, null);
                  }
                }
                referenceNode = span;
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
                  span = existingSpan;

                  // Preserve old width BEFORE updating textContent to prevent flash
                  // Get the current width (which is the old digit's width)
                  const oldWidth = span.getBoundingClientRect().width;

                  // Ensure display is inline-block so width can be applied
                  span.style.display = "inline-block";

                  // Constrain to old width IMMEDIATELY before updating textContent
                  // This prevents flash of natural width when textContent changes
                  if (oldWidth > 0) {
                    span.style.width = `${oldWidth}px`;
                    span.style.minWidth = `${oldWidth}px`;
                    span.style.maxWidth = `${oldWidth}px`;
                    // Force reflow to ensure width constraint is applied
                    void span.offsetWidth;
                  }

                  // NOW update textContent (span is already constrained, so no flash)
                  if (span.textContent !== char) {
                    span.textContent = char ?? "";
                  }

                  // Update data-char-index to ensure it's correct
                  span.setAttribute("data-char-index", i.toString());
                  // Don't set data-flow for barrel wheel (barrel wheel code handles it)
                  span.removeAttribute("data-flow");
                  if (isUnchanged) {
                    span.setAttribute("data-show", "");
                  } else {
                    span.removeAttribute("data-show");
                  }
                  // Reset color in case it was hidden from previous animation
                  span.style.color = "";
                  // Remove data-width-animate if present (barrel wheel code will add it)
                  span.removeAttribute("data-width-animate");
                  usedSpans.add(span);
                  // Ensure it's in the correct position, preserving any ongoing animations
                  if (referenceNode) {
                    const nextSibling = referenceNode.nextSibling;
                    if (span.previousSibling !== referenceNode && nextSibling) {
                      moveElementPreservingAnimation(
                        span,
                        spanRef.current,
                        nextSibling
                      );
                    } else if (
                      !nextSibling &&
                      span.parentNode !== spanRef.current
                    ) {
                      moveElementPreservingAnimation(
                        span,
                        spanRef.current,
                        null
                      );
                    }
                  }
                  referenceNode = span;
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
                    span = existingSpan;
                    // Update textContent if needed (should match the final digit)
                    if (span.textContent !== char) {
                      span.textContent = char ?? "";
                    }
                    // Ensure data-char-index is correct
                    span.setAttribute("data-char-index", i.toString());
                    // Keep it transparent (barrel wheel is still animating)
                    span.style.color = "transparent";
                    // Don't set data-flow (barrel wheel handles it)
                    span.removeAttribute("data-flow");
                    if (isUnchanged) {
                      span.setAttribute("data-show", "");
                    } else {
                      span.removeAttribute("data-show");
                    }
                    usedSpans.add(span);
                    // Ensure it's in the correct position, preserving any ongoing animations
                    if (referenceNode) {
                      const nextSibling = referenceNode.nextSibling;
                      if (
                        span.previousSibling !== referenceNode &&
                        nextSibling
                      ) {
                        moveElementPreservingAnimation(
                          span,
                          spanRef.current,
                          nextSibling
                        );
                      } else if (
                        !nextSibling &&
                        span.parentNode !== spanRef.current
                      ) {
                        moveElementPreservingAnimation(
                          span,
                          spanRef.current,
                          null
                        );
                      }
                    }
                    referenceNode = span;
                  } else {
                    // Remove existing span at this index if it exists and doesn't match
                    if (existingSpan && existingSpan.textContent !== char) {
                      // Only remove if not animating (not hidden, not part of barrel wheel, and not in flow animation)
                      // Also don't remove if the span's content appears elsewhere in the new text
                      // (it might be reused at a different index when separators shift things)
                      const hasFlowAnimation =
                        existingSpan.hasAttribute("data-flow");
                      const contentWillBeReused =
                        existingSpan.textContent &&
                        newFormattedText.includes(existingSpan.textContent);
                      const isCurrentlyAnimating =
                        hasFlowAnimation ||
                        (isHidden && !hasBarrelWheel) ||
                        (hasWidthAnimation && !hasBarrelWheel);
                      if (!isCurrentlyAnimating && !contentWillBeReused) {
                        existingSpan.remove();
                        existingSpansByIndex.delete(i);
                        usedSpans.delete(existingSpan);
                      }
                    }

                    // Create new span
                    span = document.createElement("span");
                    span.setAttribute("data-char-index", i.toString());
                    span.textContent = char ?? "";

                    if (!barrelWheel) {
                      span.setAttribute("data-flow", "");
                    }
                    if (isUnchanged) {
                      span.setAttribute("data-show", "");
                    } else if (isAdded) {
                      // Animate width from 0 for newly added digits
                      span.style.width = "0px";
                      span.style.minWidth = "0px";
                      span.style.maxWidth = "0px";
                    }

                    // Insert at correct position
                    if (referenceNode) {
                      spanRef.current.insertBefore(
                        span,
                        referenceNode.nextSibling
                      );
                    } else {
                      spanRef.current.insertBefore(
                        span,
                        spanRef.current.firstChild
                      );
                    }
                    referenceNode = span;
                  }
                }
              }
            }

            newSpans.push(span);
          }

          // Remove unused spans that aren't animating
          // Also check for spans that are hidden (color: transparent) which indicates barrel wheel animation
          // IMPORTANT: Check for barrel wheels in DOM, not just formattedChanges.barrelWheelIndices,
          // because indices may have shifted when characters were inserted before animating digits
          allExistingSpans.forEach((span) => {
            if (!usedSpans.has(span)) {
              const index = parseInt(
                span.getAttribute("data-char-index") ?? "-1",
                10
              );
              const isHidden =
                span.style.color === "transparent" ||
                span.style.color === "rgba(0, 0, 0, 0)" ||
                window.getComputedStyle(span).color === "rgba(0, 0, 0, 0)";
              // Check if there's actually a barrel wheel for this index in the DOM
              // (indices may have shifted, so formattedChanges.barrelWheelIndices might not be accurate)
              const hasBarrelWheelInDOM = parentContainer?.querySelector(
                `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
              );
              // Map formatted index to raw index for barrel wheel check
              const rawIdx = mapFormattedToRawIndex(
                cleanedText,
                newFormattedText,
                index
              );
              const hasBarrelWheel =
                changes.barrelWheelIndices.has(rawIdx) || !!hasBarrelWheelInDOM;
              const hasWidthAnimation = span.hasAttribute("data-width-animate");
              const isCurrentlyAnimating =
                hasBarrelWheel || hasWidthAnimation || isHidden;

              // If text is empty, remove all spans regardless of animation state
              // This handles the case where user selects all and deletes
              if (newFormattedText.length === 0) {
                span.remove();
              } else if (!isCurrentlyAnimating) {
                // Only remove if not currently animating
                span.remove();
              }
            }
          });

          // Final verification: ensure all spans have correct textContent
          // This catches any cases where spans weren't properly updated
          for (let i = 0; i < newFormattedText.length; i++) {
            const char = newFormattedText[i];
            const span = newSpans[i];
            if (span && span.textContent !== char) {
              span.textContent = char ?? "";
            }
          }

          // Reposition all barrel wheels after DOM update completes
          // This ensures barrel wheels stay aligned whenever characters are inserted/deleted
          // Use requestAnimationFrame to ensure DOM has fully updated
          requestAnimationFrame(() => {
            repositionAllBarrelWheels();
          });

          // Remove any remaining spans with invalid indices or wrong characters
          // Also check for duplicate indices and transparent spans that are ghosts
          const allSpans = Array.from(
            spanRef.current.querySelectorAll("[data-char-index]")
          ) as HTMLElement[];

          // Track spans by index to detect duplicates
          const spansByIndex = new Map<number, HTMLElement[]>();
          allSpans.forEach((span) => {
            const index = parseInt(
              span.getAttribute("data-char-index") ?? "-1",
              10
            );
            if (index >= 0) {
              if (!spansByIndex.has(index)) {
                spansByIndex.set(index, []);
              }
              spansByIndex.get(index)!.push(span);
            }
          });

          // Handle duplicate indices - keep the one that's animating or matches the character, remove others
          spansByIndex.forEach((spans, index) => {
            if (spans.length > 1) {
              // Find the span that should be kept
              let spanToKeep: HTMLElement | null = null;

              // First, try to find one that matches the expected character
              const expectedChar = cleanedText[index];
              for (const span of spans) {
                if (span.textContent === expectedChar) {
                  const isHidden =
                    span.style.color === "transparent" ||
                    span.style.color === "rgba(0, 0, 0, 0)" ||
                    window.getComputedStyle(span).color === "rgba(0, 0, 0, 0)";
                  // Prefer non-transparent spans that match the character
                  if (!isHidden) {
                    spanToKeep = span;
                    break;
                  } else if (!spanToKeep) {
                    // Keep transparent one as fallback if it matches
                    spanToKeep = span;
                  }
                }
              }

              // If no matching character found, find the animating one
              if (!spanToKeep) {
                for (const span of spans) {
                  const isHidden =
                    span.style.color === "transparent" ||
                    span.style.color === "rgba(0, 0, 0, 0)" ||
                    window.getComputedStyle(span).color === "rgba(0, 0, 0, 0)";
                  const hasBarrelWheelInDOM = parentContainer?.querySelector(
                    `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
                  );
                  const hasWidthAnimation =
                    span.hasAttribute("data-width-animate");
                  if (isHidden || hasBarrelWheelInDOM || hasWidthAnimation) {
                    spanToKeep = span;
                    break;
                  }
                }
              }

              // If still no span found, keep the first one
              if (!spanToKeep && spans.length > 0) {
                const firstSpan = spans.find(() => true);
                if (firstSpan) {
                  spanToKeep = firstSpan;
                }
              }

              // Remove all other spans at this index
              if (spanToKeep) {
                spans.forEach((span) => {
                  if (span !== spanToKeep) {
                    span.remove();
                  }
                });
              }
            }
          });

          // Now check remaining spans for out-of-bounds or wrong characters
          const remainingSpans = Array.from(
            spanRef.current.querySelectorAll("[data-char-index]")
          ) as HTMLElement[];
          remainingSpans.forEach((span) => {
            const index = parseInt(
              span.getAttribute("data-char-index") ?? "-1",
              10
            );
            const isHidden =
              span.style.color === "transparent" ||
              span.style.color === "rgba(0, 0, 0, 0)" ||
              window.getComputedStyle(span).color === "rgba(0, 0, 0, 0)";
            // Check if there's actually a barrel wheel for this index in the DOM
            const hasBarrelWheelInDOM = parentContainer?.querySelector(
              `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
            );
            // Map formatted index to raw index for barrel wheel check
            const rawIdx = mapFormattedToRawIndex(
              cleanedText,
              newFormattedText,
              index
            );
            const hasBarrelWheel =
              changes.barrelWheelIndices.has(rawIdx) || !!hasBarrelWheelInDOM;
            const hasWidthAnimation = span.hasAttribute("data-width-animate");
            const isCurrentlyAnimating =
              hasBarrelWheel || hasWidthAnimation || isHidden;

            // If text is empty, remove all spans
            if (newFormattedText.length === 0) {
              span.remove();
              return;
            }

            // Remove if index is out of bounds
            // For short newFormattedText (like "-"), we should be more aggressive about removing out-of-bounds spans
            // to prevent ghost characters
            if (index < 0 || index >= newFormattedText.length) {
              // Remove out-of-bounds spans unless they're currently animating AND newFormattedText is long enough
              // This prevents ghost characters when newFormattedText changes significantly (e.g., "1881" -> "-")
              if (!isCurrentlyAnimating || newFormattedText.length <= 1) {
                span.remove();
              }
            } else if (span.textContent !== newFormattedText[index]) {
              // Character mismatch - update or remove
              // If it's a transparent span with wrong character and no barrel wheel, it's a ghost - remove it
              if (isHidden && !hasBarrelWheelInDOM && !hasBarrelWheel) {
                span.remove();
              } else if (!isCurrentlyAnimating) {
                // Update textContent to match
                span.textContent = newFormattedText[index] ?? "";
              }
            }
          });
        }

        // Animate new characters and create barrel wheels
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          const flowElements = spanRef.current?.querySelectorAll("[data-flow]");
          if (flowElements) {
            Array.from(flowElements).forEach((element) => {
              const index = parseInt(
                (element as HTMLElement).getAttribute("data-char-index") ??
                  "-1",
                10
              );
              if (
                element instanceof HTMLElement &&
                formattedChanges.addedIndices.has(index)
              ) {
                element.dataset.show = "";
                const span = spanRef.current;
                if (span) {
                  const width = measureText(element.textContent, span);
                  element.style.width = `${width}px`;
                  element.style.minWidth = `${width}px`;
                  element.style.maxWidth = `${width}px`;

                  // Remove inline width styles after transition completes
                  const handleTransitionEnd = (e: TransitionEvent) => {
                    if (
                      ["width", "min-width", "max-width"].includes(
                        e.propertyName
                      )
                    ) {
                      element.style.width = "";
                      element.style.minWidth = "";
                      element.style.maxWidth = "";
                      element.removeEventListener(
                        "transitionend",
                        handleTransitionEnd
                      );
                    }
                  };
                  element.addEventListener(
                    "transitionend",
                    handleTransitionEnd
                  );
                }
              }
            });
          }

          // Create barrel wheels as absolutely positioned elements outside contentEditable
          // Map raw indices to formatted indices for barrel wheel positioning
          const barrelWheelIndices = Array.from(
            changes.barrelWheelIndices.keys()
          );
          barrelWheelIndices.forEach((rawIndex) => {
            const barrelWheelData = changes.barrelWheelIndices.get(rawIndex);
            // Map raw index to formatted index
            const index = mapRawToFormattedIndex(
              cleanedText,
              newFormattedText,
              rawIndex
            );
            if (!barrelWheelData) {
              return;
            }

            const direction = barrelWheelData.direction;
            const finalDigitStr =
              barrelWheelData.sequence[barrelWheelData.sequence.length - 1];
            const finalDigit = finalDigitStr ? parseInt(finalDigitStr, 10) : 0;
            const initialDigitStr = barrelWheelData.sequence[0];

            // Determine old and new digits based on direction
            // When direction is "up": sequence = [old, ..., new] so initialDigitStr = old, finalDigitStr = new
            // When direction is "down": sequence = [new, ..., old] so initialDigitStr = new, finalDigitStr = old
            const oldDigitStr =
              direction === "up" ? initialDigitStr : finalDigitStr;
            const newDigitStr =
              direction === "up" ? finalDigitStr : initialDigitStr;

            // Find the span element at this index
            const charSpan = spanRef.current?.querySelector(
              `[data-char-index="${index}"]`
            );
            if (!charSpan || !(charSpan instanceof HTMLElement)) {
              return;
            }

            // Get position of the character span relative to the parent container
            const parentContainer = spanRef.current?.parentElement;
            if (!parentContainer) {
              return;
            }

            // Check if a barrel wheel already exists for this index
            const existingWheel = parentContainer.querySelector(
              `[data-char-index="${index}"].${styles.barrel_wheel || ""}`
            ) as HTMLElement | null;

            if (existingWheel) {
              // Reuse existing barrel wheel - update direction and position
              const existingWrapper = existingWheel.querySelector(
                `.${styles.barrel_digits_wrapper || ""}`
              ) as HTMLElement | null;

              if (existingWrapper) {
                // IMPORTANT: Update the character span's textContent to the new digit
                // This ensures the span has the correct final digit when the animation completes
                if (charSpan.textContent !== newDigitStr) {
                  charSpan.textContent = newDigitStr ?? "";
                }

                existingWheel.setAttribute(
                  "data-final-digit",
                  newDigitStr ?? ""
                );

                requestAnimationFrame(() => {
                  existingWrapper.style.setProperty(
                    "--digit-position",
                    newDigitStr ?? ""
                  );
                });

                const oldDigitWidth = oldDigitStr
                  ? measureText(oldDigitStr, charSpan)
                  : 0;
                const newDigitWidth = newDigitStr
                  ? measureText(newDigitStr, charSpan)
                  : 0;

                if (oldDigitWidth > 0 && newDigitWidth > 0) {
                  const currentWidth = charSpan.getBoundingClientRect().width;
                  setWidthConstraints(charSpan, currentWidth);
                  charSpan.setAttribute("data-width-animate", "");

                  requestAnimationFrame(() => {
                    setWidthConstraints(charSpan, newDigitWidth);
                  });
                }

                repositionBarrelWheel(existingWheel, charSpan, parentContainer);
                charSpan.style.color = "transparent";
                return;
              }
            }

            const oldDigitWidth = oldDigitStr
              ? measureText(oldDigitStr, charSpan)
              : 0;
            const newDigitWidth = newDigitStr
              ? measureText(newDigitStr, charSpan)
              : 0;

            const wheel = document.createElement("span");
            wheel.className = styles.barrel_wheel || "";
            wheel.setAttribute("data-direction", direction);
            wheel.setAttribute("data-final-digit", finalDigit.toString());
            wheel.setAttribute("data-char-index", index.toString());

            const wrapper = document.createElement("div");
            wrapper.className = styles.barrel_digits_wrapper || "";
            wrapper.style.position = "relative";

            // Create digits 0-9
            for (let digit = 0; digit <= 9; digit++) {
              const digitStr = digit.toString();
              const digitElement = document.createElement("div");
              digitElement.className = styles.barrel_digit || "";
              digitElement.setAttribute("data-digit", digitStr);
              digitElement.textContent = digitStr;
              digitElement.style.position = "relative";
              digitElement.style.height = "1em";
              digitElement.style.lineHeight = "1em";
              wrapper.appendChild(digitElement);
            }

            const rect = charSpan.getBoundingClientRect();
            const parentRect = parentContainer.getBoundingClientRect();

            wheel.style.position = "absolute";
            wheel.style.left = `${rect.left - parentRect.left}px`;
            wheel.style.top = `${rect.top - parentRect.top}px`;
            wheel.style.width = `${rect.width}px`;
            wheel.style.height = `${rect.height}px`;
            wheel.style.display = "flex";

            charSpan.style.color = "transparent";
            wheel.appendChild(wrapper);
            parentContainer.appendChild(wheel);

            // Set initial width synchronously to prevent flash
            if (oldDigitWidth > 0 && newDigitWidth > 0) {
              setWidthConstraints(charSpan, oldDigitWidth);
              void charSpan.offsetWidth;
              charSpan.setAttribute("data-width-animate", "");
              void charSpan.offsetWidth;
            }

            requestAnimationFrame(() => {
              // Verify width constraints are still set
              if (oldDigitWidth > 0 && newDigitWidth > 0) {
                if (!charSpan.style.width || charSpan.style.width === "") {
                  setWidthConstraints(charSpan, oldDigitWidth);
                  void charSpan.offsetWidth;
                }
                if (!charSpan.hasAttribute("data-width-animate")) {
                  charSpan.setAttribute("data-width-animate", "");
                  void charSpan.offsetWidth;
                }
              }

              const initialPosition = oldDigitStr
                ? parseInt(oldDigitStr, 10)
                : 0;
              const finalPosition = newDigitStr ? parseInt(newDigitStr, 10) : 0;

              wrapper.style.setProperty(
                "--digit-position",
                initialPosition.toString()
              );

              requestAnimationFrame(() => {
                wrapper.classList.add(styles.animating || "");

                requestAnimationFrame(() => {
                  wrapper.style.setProperty(
                    "--digit-position",
                    finalPosition.toString()
                  );

                  if (oldDigitWidth > 0 && newDigitWidth > 0) {
                    if (!charSpan.style.width || charSpan.style.width === "") {
                      setWidthConstraints(charSpan, oldDigitWidth);
                      void charSpan.offsetWidth;
                    }

                    if (!charSpan.hasAttribute("data-width-animate")) {
                      charSpan.setAttribute("data-width-animate", "");
                    }
                    if (
                      window.getComputedStyle(charSpan).display !==
                      "inline-block"
                    ) {
                      charSpan.style.display = "inline-block";
                    }
                    void charSpan.offsetWidth;

                    // Set up ResizeObserver to update barrel wheel position during width animation
                    const existingObserver =
                      resizeObserversRef.current.get(index);
                    if (existingObserver) {
                      existingObserver.disconnect();
                      resizeObserversRef.current.delete(index);
                    }

                    const resizeObserver = new ResizeObserver(() => {
                      if (!spanRef.current || !charSpan) {
                        return;
                      }
                      const parent = spanRef.current.parentElement;
                      if (!parent) {
                        return;
                      }

                      const bw = getBarrelWheel(
                        parent,
                        index,
                        styles.barrel_wheel || ""
                      );
                      if (bw) {
                        const rect = charSpan.getBoundingClientRect();
                        const parentRect = parent.getBoundingClientRect();
                        bw.style.left = `${rect.left - parentRect.left}px`;
                        bw.style.width = `${rect.width}px`;
                      }
                    });

                    resizeObserver.observe(charSpan);
                    resizeObserversRef.current.set(index, resizeObserver);

                    requestAnimationFrame(() => {
                      void charSpan.offsetWidth;

                      const computedStyle = window.getComputedStyle(charSpan);
                      const transition = computedStyle.transition;

                      if (
                        !transition ||
                        transition === "none" ||
                        transition === "all 0s ease 0s"
                      ) {
                        charSpan.style.transition =
                          "width 0.4s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.4s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
                        void charSpan.offsetWidth;
                      }

                      setWidthConstraints(charSpan, newDigitWidth);

                      const handleWidthAnimationEnd = (e: TransitionEvent) => {
                        if (
                          ["width", "min-width", "max-width"].includes(
                            e.propertyName
                          )
                        ) {
                          cleanupWidthAnimation(charSpan);
                          charSpan.removeEventListener(
                            "transitionend",
                            handleWidthAnimationEnd
                          );

                          const observer =
                            resizeObserversRef.current.get(index);
                          if (observer) {
                            observer.disconnect();
                            resizeObserversRef.current.delete(index);
                          }
                        }
                      };
                      charSpan.addEventListener(
                        "transitionend",
                        handleWidthAnimationEnd
                      );
                    });
                  }

                  wrapper.addEventListener(
                    "transitionend",
                    () => {
                      const currentIndexStr =
                        wheel.getAttribute("data-char-index");
                      const currentIndex =
                        currentIndexStr !== null
                          ? parseInt(currentIndexStr, 10)
                          : index;
                      const finalDigitAttr =
                        wheel.getAttribute("data-final-digit");
                      const finalDigit =
                        finalDigitAttr !== null ? finalDigitAttr : newDigitStr;

                      // Clean up ResizeObserver
                      const observer =
                        resizeObserversRef.current.get(currentIndex) ||
                        resizeObserversRef.current.get(index);
                      if (observer) {
                        observer.disconnect();
                        resizeObserversRef.current.delete(currentIndex);
                        resizeObserversRef.current.delete(index);
                      }

                      // Find the target span
                      let targetSpan: HTMLElement | null = null;
                      if (spanRef.current) {
                        const spanAtCurrentIndex =
                          spanRef.current.querySelector(
                            `[data-char-index="${currentIndex}"]`
                          ) as HTMLElement | null;
                        if (spanAtCurrentIndex) {
                          targetSpan = spanAtCurrentIndex;
                        }
                      }

                      // Fallback to closure span if it matches
                      if (
                        !targetSpan &&
                        charSpan instanceof HTMLElement &&
                        charSpan.textContent === finalDigit
                      ) {
                        const spanIndex =
                          charSpan.getAttribute("data-char-index");
                        if (spanIndex !== currentIndex.toString()) {
                          charSpan.setAttribute(
                            "data-char-index",
                            currentIndex.toString()
                          );
                        }
                        targetSpan = charSpan;
                      }

                      // Clean up target span
                      if (targetSpan instanceof HTMLElement) {
                        cleanupWidthAnimation(targetSpan);
                        removeTransparentColor(targetSpan);
                        targetSpan.removeAttribute("data-flow");
                        targetSpan.style.transition = "none";
                      }

                      // Safety cleanup for transparent span at current index
                      if (!targetSpan && spanRef.current) {
                        const spanAtCurrentIndex =
                          spanRef.current.querySelector(
                            `[data-char-index="${currentIndex}"]`
                          ) as HTMLElement | null;
                        if (
                          spanAtCurrentIndex &&
                          isTransparent(spanAtCurrentIndex)
                        ) {
                          removeTransparentColor(spanAtCurrentIndex);
                          spanAtCurrentIndex.removeAttribute("data-flow");
                          spanAtCurrentIndex.style.transition = "none";
                          cleanupWidthAnimation(spanAtCurrentIndex);
                        }
                      }

                      wheel.remove();

                      // Final safety check after DOM update
                      requestAnimationFrame(() => {
                        if (!spanRef.current) {
                          return;
                        }
                        const spanAtCurrentIndex =
                          spanRef.current.querySelector(
                            `[data-char-index="${currentIndex}"]`
                          ) as HTMLElement | null;

                        if (
                          spanAtCurrentIndex &&
                          isTransparent(spanAtCurrentIndex)
                        ) {
                          const parent = spanRef.current.parentElement;
                          const hasBarrelWheel =
                            parent &&
                            getBarrelWheel(
                              parent,
                              currentIndex,
                              styles.barrel_wheel || ""
                            );
                          if (!hasBarrelWheel) {
                            removeTransparentColor(spanAtCurrentIndex);
                          }
                        }
                      });
                    },
                    { once: true }
                  );
                });
              });
            });
          });

          // Apply x-position animations for characters that moved
          // (separators and digits that crossed group boundaries)
          if (positionChanges.length > 0 && spanRef.current) {
            const containerRect = spanRef.current.getBoundingClientRect();

            positionChanges.forEach((change) => {
              const span = spanRef.current?.querySelector(
                `[data-char-index="${change.newIndex}"]`
              ) as HTMLElement | null;

              if (span && span.textContent === change.char) {
                // Look up old position using the character and its old index
                const oldKey = `${change.char}@${change.oldIndex}`;
                const oldPos = oldPositions.get(oldKey);

                if (oldPos) {
                  const newRect = span.getBoundingClientRect();
                  const newX = newRect.left - containerRect.left;
                  const offsetX = oldPos.x - newX;

                  // Only animate if there's a significant position change
                  if (Math.abs(offsetX) > 1) {
                    // Use Web Animations API for smooth x-position animation
                    span.animate(
                      [
                        { transform: `translateX(${offsetX}px)` },
                        { transform: "translateX(0)" },
                      ],
                      {
                        duration: 250,
                        easing: "cubic-bezier(0.33, 1, 0.68, 1)", // ease-out-cubic
                        fill: "forwards",
                      }
                    );
                  }
                }
              }
            });
          }
        });

        const setCursor = () => {
          if (!spanRef.current) {
            return;
          }
          // Map raw cursor position to formatted position
          const formattedCursorPos = mapRawToFormattedIndex(
            cleanedText,
            newFormattedText,
            Math.min(newCursorPos, cleanedText.length)
          );
          setCursorPositionInElement(spanRef.current, formattedCursorPos);
        };

        setCursor();
        requestAnimationFrame(setCursor);
      }
    },
    [
      displayValue,
      onChange,
      autoAddLeadingZero,
      repositionAllBarrelWheels,
      addToHistory,
      formatRawValue,
      mapRawToFormattedIndex,
      mapFormattedToRawIndex,
    ]
  );

  // Initialize
  useEffect(() => {
    if (spanRef.current && formattedDisplayValue) {
      spanRef.current.textContent = formattedDisplayValue;
    }
    // Initialize history with initial state
    if (historyRef.current.length === 0) {
      const initialValue = actualValue;
      historyRef.current.push({
        text: displayValue,
        cursorPosBefore: 0,
        cursorPosAfter: 0,
        value: initialValue,
      });
      historyIndexRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const newRawDisplay = actualValue?.toString() ?? "";
    const currentParsed = ["", "-", ".", "-."].includes(displayValue)
      ? undefined
      : parseFloat(displayValue);

    if (currentParsed !== actualValue) {
      setDisplayValue(newRawDisplay);
      if (spanRef.current) {
        if (actualValue === undefined && displayValue !== newRawDisplay) {
          spanRef.current
            .querySelectorAll("[data-char-index]")
            .forEach((span) => span.remove());
          getAllBarrelWheels(
            spanRef.current.parentElement!,
            styles.barrel_wheel || ""
          ).forEach((wheel) => wheel.remove());
        }
        // Format the new value for display
        const newFormattedDisplay = formatRawValue(newRawDisplay);
        spanRef.current.textContent = newFormattedDisplay;
        prevFormattedValueRef.current = newFormattedDisplay;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualValue, displayValue, formatRawValue]);

  // Handle format or locale prop changes - animate the transition
  useEffect(() => {
    if (!spanRef.current) {
      return;
    }

    const oldFormattedText = prevFormattedValueRef.current;
    const newFormattedText = formattedDisplayValue;

    // Skip if no actual change
    if (oldFormattedText === newFormattedText) {
      return;
    }

    // Clear any ongoing barrel wheel animations since indices may have changed
    const parentContainer = spanRef.current.parentElement;
    if (parentContainer) {
      getAllBarrelWheels(parentContainer, styles.barrel_wheel || "").forEach(
        (wheel) => wheel.remove()
      );
    }

    // Clear ResizeObservers
    resizeObserversRef.current.forEach((observer) => observer.disconnect());
    resizeObserversRef.current.clear();

    // Capture old positions BEFORE updating DOM
    const oldPositions = new Map<string, { x: number; width: number }>();
    const containerRect = spanRef.current.getBoundingClientRect();
    const existingSpans = spanRef.current.querySelectorAll("[data-char-index]");
    existingSpans.forEach((span) => {
      const el = span as HTMLElement;
      const index = parseInt(el.getAttribute("data-char-index") ?? "-1", 10);
      const char = el.textContent ?? "";
      if (index >= 0 && char) {
        const rect = el.getBoundingClientRect();
        oldPositions.set(`${char}@${index}`, {
          x: rect.left - containerRect.left,
          width: rect.width,
        });
      }
    });

    // Build maps of character positions for matching old -> new
    const oldDigitPositions = new Map<string, number[]>();
    const oldSeparatorPositions = new Map<string, number[]>();
    for (let i = 0; i < oldFormattedText.length; i++) {
      const char = oldFormattedText[i] ?? "";
      if (!char) {
        continue;
      }
      const isSep = !isRawChar(char);
      const map = isSep ? oldSeparatorPositions : oldDigitPositions;
      if (!map.has(char)) {
        map.set(char, []);
      }
      map.get(char)!.push(i);
    }

    // Track which old positions have been matched
    const usedOldPositions = new Set<number>();

    // First pass: match old characters to new characters
    const oldToNewMapping = new Map<number, number>(); // oldIndex -> newIndex
    const newToOldMapping = new Map<number, number>(); // newIndex -> oldIndex

    for (let newIdx = 0; newIdx < newFormattedText.length; newIdx++) {
      const char = newFormattedText[newIdx] ?? "";
      if (!char) {
        continue;
      }

      const isSeparator = !isRawChar(char);
      const posMap = isSeparator ? oldSeparatorPositions : oldDigitPositions;
      const oldIndices = posMap.get(char) ?? [];

      for (const oldIdx of oldIndices) {
        if (!usedOldPositions.has(oldIdx)) {
          usedOldPositions.add(oldIdx);
          oldToNewMapping.set(oldIdx, newIdx);
          newToOldMapping.set(newIdx, oldIdx);
          break;
        }
      }
    }

    // Find separators that need to be removed (in old but not matched)
    const separatorsToRemove: { char: string; oldIndex: number }[] = [];
    for (let i = 0; i < oldFormattedText.length; i++) {
      const char = oldFormattedText[i] ?? "";
      if (!char) {
        continue;
      }

      const isSeparator = !isRawChar(char);
      if (isSeparator && !usedOldPositions.has(i)) {
        separatorsToRemove.push({ char, oldIndex: i });
      }
    }

    // Build merged sequence: new characters + old separators to remove (in correct positions)
    // The merged sequence maintains visual order during animation
    type MergedItem =
      | { type: "new"; char: string; newIndex: number; isNewSeparator: boolean }
      | { type: "removing"; char: string; oldIndex: number };

    const mergedItems: MergedItem[] = [];

    // Add new characters
    for (let i = 0; i < newFormattedText.length; i++) {
      const char = newFormattedText[i] ?? "";
      if (!char) {
        continue;
      }

      const isSeparator = !isRawChar(char);
      const isNewSeparator = isSeparator && !newToOldMapping.has(i);

      mergedItems.push({
        type: "new",
        char,
        newIndex: i,
        isNewSeparator: isNewSeparator && oldFormattedText.length > 0,
      });
    }

    // Insert removing separators at their visual positions
    // We need to figure out where they should go based on surrounding characters
    separatorsToRemove.forEach(({ char, oldIndex }) => {
      // Find the position in the merged array where this separator should go
      // It should be after any new characters that come from old positions before it
      // and before any new characters that come from old positions after it

      let insertPosition = 0;
      for (let i = 0; i < mergedItems.length; i++) {
        const item = mergedItems[i];
        if (item?.type === "new") {
          const oldIdx = newToOldMapping.get(item.newIndex);
          if (oldIdx !== undefined && oldIdx < oldIndex) {
            insertPosition = i + 1;
          }
        }
      }

      mergedItems.splice(insertPosition, 0, {
        type: "removing",
        char,
        oldIndex,
      });
    });

    // Clear the container
    spanRef.current.innerHTML = "";

    // Create spans based on merged sequence
    const newSpans: HTMLElement[] = [];
    const addedSeparatorSpans: { span: HTMLElement; finalWidth: number }[] = [];
    const removingSpans: HTMLElement[] = [];

    let newCharIndex = 0;
    mergedItems.forEach((item) => {
      if (!item) {
        return;
      }

      const span = document.createElement("span");
      span.textContent = item.char;

      if (item.type === "new") {
        span.setAttribute("data-char-index", item.newIndex.toString());

        if (item.isNewSeparator) {
          // New separator - animate in with width from 0 and slide up
          span.setAttribute("data-flow", "");
          spanRef.current!.appendChild(span);
          const finalWidth = span.getBoundingClientRect().width;
          span.style.width = "0px";
          span.style.minWidth = "0px";
          span.style.maxWidth = "0px";
          addedSeparatorSpans.push({ span, finalWidth });
        } else {
          // Existing character or digit - show immediately
          span.setAttribute("data-flow", "");
          span.setAttribute("data-show", "");
          spanRef.current!.appendChild(span);
        }
        newSpans.push(span);
        newCharIndex++;
      } else {
        // Removing separator - keep in flow, will animate out
        const oldKey = `${item.char}@${item.oldIndex}`;
        const oldPos = oldPositions.get(oldKey);

        span.setAttribute("data-flow", "");
        span.setAttribute("data-show", "");
        span.setAttribute("data-removing", "");
        span.style.overflow = "visible";
        span.style.display = "inline-block"; // Required for width animation on inline elements
        if (oldPos) {
          span.style.width = `${oldPos.width}px`;
          span.style.minWidth = `${oldPos.width}px`;
          span.style.maxWidth = `${oldPos.width}px`;
        }
        spanRef.current!.appendChild(span);
        removingSpans.push(span);
      }
    });

    // Force reflow
    void spanRef.current.offsetWidth;

    // Get new container rect for position calculations
    const newContainerRect = spanRef.current.getBoundingClientRect();

    // Apply x-position animations for digits that moved
    newSpans.forEach((span) => {
      const char = span.textContent ?? "";
      if (!char) {
        return;
      }

      const isSeparator = !isRawChar(char);
      if (isSeparator) {
        return;
      } // Don't animate x for separators, they use width animation

      // Find the old position for this character using the mapping
      const newIndex = parseInt(
        span.getAttribute("data-char-index") ?? "-1",
        10
      );
      const oldIndex = newToOldMapping.get(newIndex);

      if (oldIndex !== undefined) {
        const oldKey = `${char}@${oldIndex}`;
        const oldPos = oldPositions.get(oldKey);
        if (oldPos) {
          const newRect = span.getBoundingClientRect();
          const newX = newRect.left - newContainerRect.left;
          const offsetX = oldPos.x - newX;

          if (Math.abs(offsetX) > 1) {
            span.animate(
              [
                { transform: `translateX(${offsetX}px)` },
                { transform: "translateX(0)" },
              ],
              {
                duration: 200,
                easing: "cubic-bezier(0.33, 1, 0.68, 1)",
                fill: "forwards",
              }
            );
          }
        }
      }
    });

    // Trigger animations in next frame
    requestAnimationFrame(() => {
      // Animate in new separators (width from 0 to final + slide up)
      addedSeparatorSpans.forEach(({ span, finalWidth }) => {
        span.setAttribute("data-show", "");
        span.style.width = `${finalWidth}px`;
        span.style.minWidth = `${finalWidth}px`;
        span.style.maxWidth = `${finalWidth}px`;

        // Clean up inline styles after transition
        const handleTransitionEnd = (e: TransitionEvent) => {
          if (e.propertyName === "width") {
            span.style.width = "";
            span.style.minWidth = "";
            span.style.maxWidth = "";
            span.style.overflow = "";
            span.removeEventListener("transitionend", handleTransitionEnd);
          }
        };
        span.addEventListener("transitionend", handleTransitionEnd);
      });

      // Animate out removed separators (width to 0 + slide down)
      removingSpans.forEach((span) => {
        span.removeAttribute("data-show");
        span.setAttribute("data-hide", "");
        span.style.width = "0px";
        span.style.minWidth = "0px";
        span.style.maxWidth = "0px";

        // Remove after animation completes
        const handleTransitionEnd = (e: TransitionEvent) => {
          if (e.propertyName === "translate" || e.propertyName === "width") {
            span.removeEventListener("transitionend", handleTransitionEnd);
            // Only remove when both animations are done
            if (
              span.style.width === "0px" &&
              span.getAttribute("data-hide") !== null
            ) {
              span.remove();
            }
          }
        };
        span.addEventListener("transitionend", handleTransitionEnd);
      });
    });

    // Update the ref to match current formatted value
    prevFormattedValueRef.current = formattedDisplayValue;

    // Only run when format or locale changes, not on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, locale, formattedDisplayValue, isRawChar]);

  // Cleanup ResizeObservers on unmount
  useEffect(() => {
    const observers = resizeObserversRef.current;
    return () => {
      observers.forEach((observer) => observer.disconnect());
      observers.clear();
    };
  }, []);

  const applyHistoryItemWithCursor = useCallback(
    (
      historyItem: {
        text: string;
        cursorPosBefore: number;
        cursorPosAfter: number;
        value: MaybeUndefined<number>;
      },
      cursorPos: number
    ) => {
      isUndoRedoRef.current = true;
      setDisplayValue(historyItem.text);
      setUncontrolledValue(historyItem.value);
      onChange?.(historyItem.value);
      setCursorPosition(cursorPos);

      if (spanRef.current) {
        clearBarrelWheelsAndSpans(
          spanRef.current,
          spanRef.current.parentElement,
          styles.barrel_wheel || ""
        );
        spanRef.current.textContent = historyItem.text;

        spanRef.current.focus();

        const restoreCursor = () => {
          if (!spanRef.current) {
            return;
          }
          spanRef.current.focus();
          setCursorAtPosition(spanRef.current, cursorPos);
          isUndoRedoRef.current = false;
        };

        restoreCursor();
        requestAnimationFrame(restoreCursor);
      }
    },
    [onChange]
  );

  const applyHistoryItem = useCallback(
    (
      historyItem:
        | {
            text: string;
            cursorPosBefore: number;
            cursorPosAfter: number;
            value: MaybeUndefined<number>;
          }
        | undefined,
      isUndo: boolean
    ) => {
      if (!historyItem) {
        return;
      }

      // For redo: use cursorPosAfter from the item
      const targetCursorPos = isUndo
        ? historyItem.cursorPosBefore
        : historyItem.cursorPosAfter;
      applyHistoryItemWithCursor(historyItem, targetCursorPos);
    },
    [applyHistoryItemWithCursor]
  );

  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLSpanElement>>(
    (event) => {
      const key = event.key;

      // Get current state (raw, unformatted)
      const currentText = displayValue;
      const currentFormattedText = formattedDisplayValue;
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);

      if (!range || !spanRef.current) {
        return;
      }

      if (!selection) {
        return;
      }
      // Get selection range in formatted positions
      const { start: formattedStart, end: formattedEnd } = getSelectionRange(
        spanRef.current,
        selection
      );
      // Convert to raw positions for working with displayValue
      const start = mapFormattedToRawIndex(
        currentText,
        currentFormattedText,
        formattedStart
      );
      const end = mapFormattedToRawIndex(
        currentText,
        currentFormattedText,
        formattedEnd
      );

      // Handle special keys
      if ((event.metaKey || event.ctrlKey) && key === "Backspace") {
        event.preventDefault();
        // Remove barrel wheels for all indices being deleted (from 0 to end)
        const indicesToRemove: number[] = [];
        for (let i = 0; i < end; i++) {
          indicesToRemove.push(i);
        }
        removeBarrelWheelsAtIndices(indicesToRemove);
        const newText = currentText.slice(end);
        updateValue(newText, 0, 0, end);
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        if (["b", "i", "u", "k"].includes(key.toLowerCase())) {
          event.preventDefault();
          return;
        }
        // Handle Undo (Cmd+Z / Ctrl+Z)
        if (key.toLowerCase() === "z" && !event.shiftKey) {
          event.preventDefault();
          if (historyIndexRef.current > 0) {
            // Get cursor position from current item BEFORE decrementing
            const cursorPos =
              historyRef.current[historyIndexRef.current]?.cursorPosBefore ?? 0;
            historyIndexRef.current--;
            // Restore text from previous item, but use cursor position from current item
            const prevItem = historyRef.current[historyIndexRef.current];
            if (prevItem) {
              applyHistoryItemWithCursor(prevItem, cursorPos);
            }
          }
          return;
        }
        // Handle Redo (Cmd+Shift+Z / Ctrl+Y or Ctrl+Shift+Z)
        if (
          (key.toLowerCase() === "z" && event.shiftKey) ||
          key.toLowerCase() === "y"
        ) {
          event.preventDefault();
          if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current++;
            // For redo, use cursorPosAfter from the item we're restoring to
            applyHistoryItem(
              historyRef.current[historyIndexRef.current],
              false
            );
          }
          return;
        }
        // Handle Cut (Cmd+X / Ctrl+X)
        if (key.toLowerCase() === "x") {
          event.preventDefault();
          // Copy to clipboard (browser handles this automatically, but we need to handle the deletion)
          if (start !== end) {
            const selectedText = currentText.slice(start, end);
            // Try to copy to clipboard, but don't fail if clipboard API is not available (e.g., in tests)
            if (
              typeof navigator !== "undefined" &&
              navigator.clipboard &&
              navigator.clipboard.writeText
            ) {
              navigator.clipboard.writeText(selectedText).catch(() => {
                // Fallback if clipboard API fails
              });
            }
            // Delete the selected text
            const newText =
              currentText.slice(0, start) + currentText.slice(end);
            updateValue(newText, start, start, end);
          }
          return;
        }
      }

      // Handle Alt/Cmd+ArrowLeft/ArrowRight (move to start/end)
      if (
        (event.metaKey || event.ctrlKey || event.altKey) &&
        (key === "ArrowLeft" || key === "ArrowRight")
      ) {
        event.preventDefault();

        if (!spanRef.current) {
          return;
        }
        const selection = window.getSelection();
        if (!selection) {
          return;
        }

        // Use formatted text length for target position
        const targetPos = key === "ArrowLeft" ? 0 : currentFormattedText.length;

        if (event.shiftKey) {
          // Extend selection to start/end
          // Use the selection's anchor point as the anchor (formatted position)
          let anchorPos = formattedStart;
          if (
            selection.anchorNode &&
            spanRef.current.contains(selection.anchorNode)
          ) {
            const anchorRange = document.createRange();
            anchorRange.selectNodeContents(spanRef.current);
            anchorRange.setEnd(selection.anchorNode, selection.anchorOffset);
            anchorPos = anchorRange.toString().length;
          }

          // Find both anchor and target nodes/offsets
          let currentPos = 0;
          const walker = document.createTreeWalker(
            spanRef.current,
            NodeFilter.SHOW_TEXT,
            null
          );
          let anchorNode: Node | null = null;
          let anchorOffset = 0;
          let targetNode: Node | null = null;
          let targetOffset = 0;

          let node: Node | null;
          while ((node = walker.nextNode())) {
            const nodeLength = node.textContent?.length ?? 0;

            // Find anchor node (selection anchor position)
            if (!anchorNode && currentPos + nodeLength >= anchorPos) {
              anchorNode = node;
              anchorOffset = anchorPos - currentPos;
            }

            // Find target node
            if (!targetNode && currentPos + nodeLength >= targetPos) {
              targetNode = node;
              targetOffset = targetPos - currentPos;
            }

            if (anchorNode && targetNode) {
              break;
            }

            currentPos += nodeLength;
          }

          if (anchorNode && targetNode) {
            const range = document.createRange();

            // Set range from anchor to target (direction matters for selection direction)
            if (key === "ArrowLeft") {
              // Selecting backwards - anchor stays, extend to start
              range.setStart(targetNode, targetOffset);
              range.setEnd(anchorNode, anchorOffset);
            } else {
              // Selecting forwards - anchor stays, extend to end
              range.setStart(anchorNode, anchorOffset);
              range.setEnd(targetNode, targetOffset);
            }

            selection.removeAllRanges();
            selection.addRange(range);
          }
        } else {
          // Move cursor to start/end
          let currentPos = 0;
          const walker = document.createTreeWalker(
            spanRef.current,
            NodeFilter.SHOW_TEXT,
            null
          );
          let node: Node | null;

          while ((node = walker.nextNode())) {
            const nodeLength = node.textContent?.length ?? 0;
            if (currentPos + nodeLength >= targetPos) {
              const offset = targetPos - currentPos;
              const range = document.createRange();
              range.setStart(node, offset);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              return;
            }
            currentPos += nodeLength;
          }

          // Fallback
          const range = document.createRange();
          range.selectNodeContents(spanRef.current);
          range.collapse(key === "ArrowLeft");
          selection.removeAllRanges();
          selection.addRange(range);
        }
        return;
      }

      const allowedKeys = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "Tab",
        "Home",
        "End",
      ];
      if (allowedKeys.includes(key)) {
        // Handle Backspace and Delete ourselves
        if (key === "Backspace") {
          event.preventDefault();
          if (start === end) {
            // No selection, delete character before cursor
            if (start > 0) {
              // Remove barrel wheel at the position being deleted
              removeBarrelWheelsAtIndices([start - 1]);
              const newText =
                currentText.slice(0, start - 1) + currentText.slice(start);
              updateValue(newText, start - 1, start - 1, start);
            }
          } else {
            // Has selection, delete selected text
            // Remove barrel wheels for all indices in the selection range
            const indicesToRemove: number[] = [];
            for (let i = start; i < end; i++) {
              indicesToRemove.push(i);
            }
            removeBarrelWheelsAtIndices(indicesToRemove);
            const newText =
              currentText.slice(0, start) + currentText.slice(end);
            updateValue(newText, start, start, end);
          }
          return;
        }

        if (key === "Delete") {
          event.preventDefault();
          if (start === end) {
            // No selection
            if (event.metaKey || event.ctrlKey) {
              // Ctrl/Cmd+Delete: delete all characters after cursor
              if (start < currentText.length) {
                // Remove barrel wheels for all indices being deleted
                const indicesToRemove: number[] = [];
                for (let i = start; i < currentText.length; i++) {
                  indicesToRemove.push(i);
                }
                removeBarrelWheelsAtIndices(indicesToRemove);
                const newText = currentText.slice(0, start);
                updateValue(newText, start, start, currentText.length);
              }
            } else {
              // Delete: delete one character after cursor
              if (start < currentText.length) {
                // Remove barrel wheel at the position being deleted
                removeBarrelWheelsAtIndices([start]);
                const newText =
                  currentText.slice(0, start) + currentText.slice(start + 1);
                updateValue(newText, start, start, start + 1);
              }
            }
          } else {
            // Has selection, delete selected text
            // Remove barrel wheels for all indices in the selection range
            const indicesToRemove: number[] = [];
            for (let i = start; i < end; i++) {
              indicesToRemove.push(i);
            }
            removeBarrelWheelsAtIndices(indicesToRemove);
            const newText =
              currentText.slice(0, start) + currentText.slice(end);
            updateValue(newText, start, start, end);
          }
          return;
        }

        // Handle ArrowLeft and ArrowRight to move cursor by one character
        // For formatted numbers, we need to work with formatted positions and skip separators
        if (key === "ArrowLeft" || key === "ArrowRight") {
          event.preventDefault();
          if (!spanRef.current) {
            return;
          }
          const selection = window.getSelection();
          if (!selection) {
            return;
          }

          // Helper to check if a character is a separator (not digit, dot, or minus)
          const isSeparator = (char: string | undefined): boolean => {
            if (!char) {
              return false;
            }
            return !/[\d.\-]/.test(char);
          };

          // Get current cursor position in formatted text
          const { start: formattedCursorStart, end: formattedCursorEnd } =
            getSelectionRange(spanRef.current, selection);

          // Calculate target position in formatted text
          let targetFormattedPos: number;
          if (event.shiftKey) {
            // Extend selection - use formatted positions directly
            const getPositionFromNode = (
              node: Node | null,
              offset: number
            ): number => {
              if (!node || !spanRef.current?.contains(node)) {
                return formattedCursorStart;
              }
              const range = document.createRange();
              range.setStart(spanRef.current, 0);
              range.setEnd(node, offset);
              return range.toString().length;
            };

            let anchorPos = getPositionFromNode(
              selection.anchorNode,
              selection.anchorOffset
            );
            let focusPos = getPositionFromNode(
              selection.focusNode,
              selection.focusOffset
            );

            if (
              anchorPos === focusPos &&
              formattedCursorStart === formattedCursorEnd
            ) {
              anchorPos = formattedCursorStart;
              focusPos = formattedCursorStart;
            }

            // Move focus, skipping separators
            if (key === "ArrowLeft") {
              targetFormattedPos = Math.max(0, focusPos - 1);
              // Skip over separators when moving left
              while (
                targetFormattedPos > 0 &&
                isSeparator(currentFormattedText[targetFormattedPos])
              ) {
                targetFormattedPos--;
              }
            } else {
              targetFormattedPos = Math.min(
                currentFormattedText.length,
                focusPos + 1
              );
              // Skip over separators when moving right
              while (
                targetFormattedPos < currentFormattedText.length &&
                isSeparator(currentFormattedText[targetFormattedPos])
              ) {
                targetFormattedPos++;
              }
            }

            // Find nodes for selection
            let currentPos = 0;
            const walker = document.createTreeWalker(
              spanRef.current,
              NodeFilter.SHOW_TEXT,
              null
            );
            let anchorNode: Node | null = null;
            let anchorOffset = 0;
            let targetNode: Node | null = null;
            let targetOffset = 0;

            let node: Node | null;
            while ((node = walker.nextNode())) {
              const nodeLength = node.textContent?.length ?? 0;

              if (!anchorNode && currentPos + nodeLength >= anchorPos) {
                anchorNode = node;
                anchorOffset = anchorPos - currentPos;
              }

              if (
                !targetNode &&
                currentPos + nodeLength >= targetFormattedPos
              ) {
                targetNode = node;
                targetOffset = targetFormattedPos - currentPos;
              }

              if (anchorNode && targetNode) {
                break;
              }

              currentPos += nodeLength;
            }

            if (targetNode) {
              try {
                selection.extend(targetNode, targetOffset);
              } catch {
                if (anchorNode) {
                  const range = document.createRange();
                  range.setStart(anchorNode, anchorOffset);
                  range.setEnd(targetNode, targetOffset);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              }
            }
          } else {
            // Move cursor (no shift key)
            if (formattedCursorStart !== formattedCursorEnd) {
              // There's a selection - move to start or end based on arrow direction
              targetFormattedPos =
                key === "ArrowLeft" ? formattedCursorStart : formattedCursorEnd;
            } else {
              // No selection - move cursor by one position, skipping separators
              if (key === "ArrowLeft") {
                targetFormattedPos = Math.max(0, formattedCursorStart - 1);
                // Skip over separators when moving left
                while (
                  targetFormattedPos > 0 &&
                  isSeparator(currentFormattedText[targetFormattedPos])
                ) {
                  targetFormattedPos--;
                }
              } else {
                targetFormattedPos = Math.min(
                  currentFormattedText.length,
                  formattedCursorStart + 1
                );
                // Skip over separators when moving right
                while (
                  targetFormattedPos < currentFormattedText.length &&
                  isSeparator(currentFormattedText[targetFormattedPos])
                ) {
                  targetFormattedPos++;
                }
              }
            }

            // Find target node using formatted position
            let currentPos = 0;
            const walker = document.createTreeWalker(
              spanRef.current,
              NodeFilter.SHOW_TEXT,
              null
            );
            let node: Node | null;

            while ((node = walker.nextNode())) {
              const nodeLength = node.textContent?.length ?? 0;
              if (currentPos + nodeLength >= targetFormattedPos) {
                const offset = targetFormattedPos - currentPos;
                const range = document.createRange();
                range.setStart(node, offset);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return;
              }
              currentPos += nodeLength;
            }

            // Fallback to start/end
            const range = document.createRange();
            range.selectNodeContents(spanRef.current);
            range.collapse(key === "ArrowLeft");
            selection.removeAllRanges();
            selection.addRange(range);
          }
          return;
        }

        // Allow other navigation keys
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        return;
      }

      // Handle character input
      if (/^\d$/.test(key)) {
        // Prevent typing digit when cursor is at position 0 and text starts with "-"
        if (currentText.startsWith("-") && start === 0 && end === 0) {
          event.preventDefault();
          return;
        }

        // Prevent adding 0 when there's already a leading 0 and cursor is before/after it
        // Also prevent adding 0 at the beginning of a number (would create leading zero)
        if (key === "0") {
          let shouldPrevent = false;
          let restorePos = start;

          // Check if text starts with "0" (including "0.")
          if (currentText.startsWith("0") && currentText.length > 0) {
            // Cursor is at position 0 (before the 0) - prevent typing another 0
            if (start === 0) {
              shouldPrevent = true;
              restorePos = start;
            }
            // Cursor is at position 1 (right after the 0) - prevent typing another 0
            // This applies even if followed by "." (e.g., "0.1121" should not become "00.1121")
            else if (start === 1 && end === 1) {
              shouldPrevent = true;
              restorePos = start;
            }
          }
          // Check if text starts with "-0" (including "-0.")
          else if (currentText.startsWith("-0") && currentText.length > 1) {
            // Cursor is at position 1 (right after "-") or 2 (right after "-0")
            // Prevent typing 0 at position 1 if we already have "-0" (whether followed by "." or not)
            if (start === 1) {
              shouldPrevent = true;
              restorePos = start;
            } else if (start === 2 && end === 2) {
              // Also prevent at position 2 (even if followed by ".")
              // This applies even if followed by "." (e.g., "-0.1121" should not become "-00.1121")
              shouldPrevent = true;
              restorePos = start;
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
            shouldPrevent = true;
            restorePos = start;
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
            shouldPrevent = true;
            restorePos = start;
          }

          if (shouldPrevent) {
            event.preventDefault();
            event.stopPropagation();
            // Mark that we should prevent the next input event
            shouldPreventInputRef.current = true;
            preventInputCursorPosRef.current = restorePos;

            // Restore cursor to original position - use both immediate and deferred restoration
            // to catch any browser default behavior
            if (spanRef.current) {
              const restoreCursor = () => {
                if (!spanRef.current) {
                  return;
                }
                const selection = window.getSelection();
                if (!selection) {
                  return;
                }

                let currentPos = 0;
                const walker = document.createTreeWalker(
                  spanRef.current,
                  NodeFilter.SHOW_TEXT,
                  null
                );
                let node: Node | null;

                while ((node = walker.nextNode())) {
                  const nodeLength = node.textContent?.length ?? 0;
                  if (currentPos + nodeLength >= restorePos) {
                    const offset = Math.min(
                      restorePos - currentPos,
                      nodeLength
                    );
                    const range = document.createRange();
                    range.setStart(node, offset);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    return;
                  }
                  currentPos += nodeLength;
                }

                // Fallback
                const range = document.createRange();
                range.selectNodeContents(spanRef.current);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
              };

              // Try immediately
              restoreCursor();

              // Also try after a microtask to catch any delayed browser behavior
              Promise.resolve().then(restoreCursor);

              // And after a short timeout as a final safeguard
              setTimeout(restoreCursor, 0);
              requestAnimationFrame(restoreCursor);
            }
            return;
          }
        }

        event.preventDefault();
        // Check maxLength before inserting
        const newLength = currentText.length - (end - start) + 1;
        if (maxLength !== undefined && newLength > maxLength) {
          return;
        }
        const newText =
          currentText.slice(0, start) + key + currentText.slice(end);
        updateValue(newText, start + 1, start, end);
        return;
      }

      // Prevent default for other character inputs
      event.preventDefault();

      // Handle decimal point input - accept both '.' and locale decimal separator
      const { decimal } = separators;
      if (key === "." || key === decimal) {
        // Only allow one decimal point (internally stored as '.')
        if (!currentText.includes(".")) {
          // Prevent typing decimal when cursor is at position 0 and text starts with "-"
          if (currentText.startsWith("-") && start === 0 && end === 0) {
            return;
          }
          // Check maxLength before inserting
          const newLength = currentText.length - (end - start) + 1;
          if (maxLength !== undefined && newLength > maxLength) {
            return;
          }
          // Always insert '.' internally (will be displayed as locale decimal)
          const newText =
            currentText.slice(0, start) + "." + currentText.slice(end);
          updateValue(newText, start + 1, start, end);
        }
        return;
      }

      if (key === "-") {
        // Only allow minus at the beginning, and only if there isn't already one
        const hasMinus = currentText.startsWith("-");
        if (start === 0 && !hasMinus) {
          // Check maxLength before inserting
          const newLength = currentText.length - (end - start) + 1;
          if (maxLength !== undefined && newLength > maxLength) {
            return;
          }
          // Insert minus at the beginning (can replace selection)
          const newText = key + currentText.slice(end);
          updateValue(newText, start + 1, start, end);
        }
        // If there's already a minus, ignore the input (don't toggle or insert)
        return;
      }
    },
    [
      displayValue,
      formattedDisplayValue,
      mapFormattedToRawIndex,
      updateValue,
      removeBarrelWheelsAtIndices,
      applyHistoryItem,
      applyHistoryItemWithCursor,
      maxLength,
      separators,
    ]
  );

  const handleCopy = useCallback<ClipboardEventHandler<HTMLSpanElement>>(
    (event) => {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      if (!range || !spanRef.current) {
        return;
      }

      if (!selection) {
        return;
      }
      const { start: formattedStart, end: formattedEnd } = getSelectionRange(
        spanRef.current,
        selection
      );
      const start = mapFormattedToRawIndex(
        displayValue,
        formattedDisplayValue,
        formattedStart
      );
      const end = mapFormattedToRawIndex(
        displayValue,
        formattedDisplayValue,
        formattedEnd
      );
      if (start === end) {
        return;
      }

      const selectedText = displayValue.slice(start, end);
      event.clipboardData.setData("text/plain", selectedText);
      event.preventDefault();
    },
    [displayValue, formattedDisplayValue, mapFormattedToRawIndex]
  );

  const handleCut = useCallback<ClipboardEventHandler<HTMLSpanElement>>(
    (event) => {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      if (!range || !spanRef.current) {
        return;
      }

      if (!selection) {
        return;
      }
      const { start: formattedStart, end: formattedEnd } = getSelectionRange(
        spanRef.current,
        selection
      );
      const start = mapFormattedToRawIndex(
        displayValue,
        formattedDisplayValue,
        formattedStart
      );
      const end = mapFormattedToRawIndex(
        displayValue,
        formattedDisplayValue,
        formattedEnd
      );
      if (start === end) {
        return;
      }

      const selectedText = displayValue.slice(start, end);
      event.clipboardData.setData("text/plain", selectedText);

      const newText = displayValue.slice(0, start) + displayValue.slice(end);
      setTimeout(() => {
        updateValue(newText, start, start, end);
      }, 0);
    },
    [displayValue, formattedDisplayValue, mapFormattedToRawIndex, updateValue]
  );

  const handleBeforeInput = useCallback<
    CompositionEventHandler<HTMLSpanElement>
  >((event) => {
    if (shouldPreventInputRef.current) {
      event.preventDefault();
      const restorePos = preventInputCursorPosRef.current;
      shouldPreventInputRef.current = false;

      const restoreCursor = () => {
        if (spanRef.current) {
          setCursorPositionInElement(spanRef.current, restorePos);
        }
      };

      restoreCursor();
      Promise.resolve().then(restoreCursor);
      setTimeout(restoreCursor, 0);
      requestAnimationFrame(restoreCursor);
    }
  }, []);

  const handleInput = useCallback(() => {
    // Reset the prevent flag after input is processed
    if (shouldPreventInputRef.current) {
      shouldPreventInputRef.current = false;
    }
  }, []);

  const handlePaste = useCallback<ClipboardEventHandler<HTMLSpanElement>>(
    (event) => {
      event.preventDefault();
      let pastedText = event.clipboardData.getData("text");

      // Convert locale decimal separator to '.' for internal storage
      const { decimal } = separators;
      if (decimal !== ".") {
        // Replace locale decimal with '.' and also accept '.' as-is
        pastedText = pastedText.replace(new RegExp(`\\${decimal}`, "g"), ".");
      }

      // Validate: only allow digits, optional minus at start, optional single decimal
      if (!/^-?\d*\.?\d*$/.test(pastedText)) {
        return;
      }

      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      if (!range || !spanRef.current) {
        return;
      }

      if (!selection) {
        return;
      }
      const { start: formattedStart, end: formattedEnd } = getSelectionRange(
        spanRef.current,
        selection
      );
      const start = mapFormattedToRawIndex(
        displayValue,
        formattedDisplayValue,
        formattedStart
      );
      const end = mapFormattedToRawIndex(
        displayValue,
        formattedDisplayValue,
        formattedEnd
      );

      // Truncate pasted text if it would exceed maxLength
      if (maxLength !== undefined) {
        const availableLength =
          maxLength - (displayValue.length - (end - start));
        if (availableLength <= 0) {
          return;
        }
        if (pastedText.length > availableLength) {
          pastedText = pastedText.slice(0, availableLength);
        }
      }

      const newText =
        displayValue.slice(0, start) + pastedText + displayValue.slice(end);

      if (/^-?\d*\.?\d*$/.test(newText)) {
        updateValue(newText, start + pastedText.length, start, end);
      }
    },
    [
      displayValue,
      formattedDisplayValue,
      mapFormattedToRawIndex,
      updateValue,
      maxLength,
      separators,
    ]
  );

  useEffect(() => {
    const span = spanRef.current;
    span?.focus();
  }, []);

  return (
    <>
      <span
        className={styles.number_flow_input_root}
        style={{
          display: "inline-flex",
        }}
      >
        <span
          className={styles.number_flow_input_wrapper}
          style={{
            display: "inline-flex",
            overflow: "hidden",
          }}
        >
          <span style={{ opacity: 0.5 }}>
            <span
              style={{
                scale: 0.75,
                display: "inline-block",
                transformOrigin: "top center",
                translate: "0 0.05em",
              }}
            >
              $
            </span>
          </span>
          <span
            ref={spanRef}
            contentEditable
            inputMode="numeric"
            suppressContentEditableWarning
            onKeyDown={handleKeyDown}
            onBeforeInput={handleBeforeInput}
            onInput={handleInput}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onCut={handleCut}
            className={styles.number_flow_input}
            style={{
              minWidth: "1ch",
              padding: "0",
            }}
            data-placeholder={placeholder}
          />
          <input
            ref={inputRef}
            {...inputProps}
            type="number"
            readOnly
            tabIndex={-1}
            className={styles.real_input}
            value={actualValue?.toString() ?? ""}
          />
        </span>
      </span>
    </>
  );
};
