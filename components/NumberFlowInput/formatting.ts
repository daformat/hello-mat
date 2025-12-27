/**
 * Formatting utilities for NumberFlowInput
 */

export type Separators = {
  decimal: string;
  group: string;
};

/**
 * Get decimal and group separators for a given locale.
 */
export const getLocaleSeparators = (
  locale?: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale
): Separators => {
  const formatter = new Intl.NumberFormat(locale);
  const parts = formatter.formatToParts(1234.5);
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  return { decimal, group };
};

/**
 * Format an intermediate state value for display.
 * Returns null if the value is not an intermediate state.
 */
const formatIntermediateState = (
  value: string,
  decimal: string
): string | null => {
  if (value === "") {
    return "";
  }
  if (value === "-") {
    return "-";
  }
  if (value === ".") {
    return decimal;
  }
  if (value === "-.") {
    return "-" + decimal;
  }
  return null;
};

type FormatOptions = {
  locale?: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale;
  format: boolean;
  autoAddLeadingZero: boolean;
  separators: Separators;
};

/**
 * Format a raw value (internal representation with '.' as decimal) for display.
 * Handles:
 * - Intermediate states (empty, minus only, decimal only, minus-decimal)
 * - Leading decimal preservation
 * - Locale-specific decimal separators
 * - Number formatting with Intl.NumberFormat
 * - Trailing decimal preservation
 * - User-typed decimal digits preservation
 */
export const formatValue = (
  rawValue: string,
  options: FormatOptions
): string => {
  const { locale, format, autoAddLeadingZero, separators } = options;
  const { decimal } = separators;

  // Handle intermediate states
  const intermediateResult = formatIntermediateState(rawValue, decimal);
  if (intermediateResult !== null) {
    return intermediateResult;
  }

  const numericValue = parseFloat(rawValue);
  if (isNaN(numericValue)) {
    return rawValue.replace(".", decimal);
  }

  // Check if user typed a leading decimal (e.g., ".5" or "-.5")
  const hasLeadingDecimal =
    rawValue.startsWith(".") || rawValue.startsWith("-.");
  if (hasLeadingDecimal && !autoAddLeadingZero) {
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

    // Preserve user-typed decimal digits
    if (dotIndex >= 0 && decimalPart.length > 0) {
      const formattedDotIndex = formatted.indexOf(decimal);
      if (formattedDotIndex >= 0) {
        formatted = formatted.slice(0, formattedDotIndex + 1) + decimalPart;
      } else {
        formatted += decimal + decimalPart;
      }
    }
  } catch {
    formatted = rawValue.replace(".", decimal);
  }

  if (hasTrailingDot && !formatted.includes(decimal)) {
    formatted += decimal;
  }

  return formatted;
};

/**
 * Check if a character is a "raw" character (digit, decimal, or minus).
 */
export const isRawCharacter = (
  char: string | undefined,
  localeDecimal: string
): boolean => {
  if (!char) {
    return false;
  }
  return /[\d.\-]/.test(char) || char === localeDecimal;
};

