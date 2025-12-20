import { MaybeUndefined } from "@/components/Media/utils/maybe"

export const cleanText = (
  text: string,
  autoAddLeadingZero: boolean
): { cleanedText: string; leadingZerosRemoved: number } => {
  let cleanedText = text.replace(/[^\d.-]/g, "")
  let leadingZerosRemoved = 0

  const minusCount = (cleanedText.match(/-/g) || []).length
  if (minusCount > 1) {
    cleanedText = cleanedText.replace(/-/g, (match, offset) =>
      offset === 0 ? match : ""
    )
  }
  if (cleanedText.includes("-") && !cleanedText.startsWith("-")) {
    cleanedText = cleanedText.replace(/-/g, "")
  }

  const dotCount = (cleanedText.match(/\./g) || []).length
  if (dotCount > 1) {
    const firstDotIndex = cleanedText.indexOf(".")
    cleanedText =
      cleanedText.slice(0, firstDotIndex + 1) +
      cleanedText.slice(firstDotIndex + 1).replace(/\./g, "")
  }

  if (
    cleanedText.length > 1 &&
    cleanedText[0] === "0" &&
    cleanedText[1] !== "."
  ) {
    const match = cleanedText.match(/^0+/)
    leadingZerosRemoved = match ? match[0].length - 1 : 0
    cleanedText = cleanedText.replace(/^0+/, "")
    if (
      cleanedText === "" ||
      cleanedText.startsWith(".") ||
      cleanedText.startsWith("-")
    ) {
      cleanedText = "0" + cleanedText
      leadingZerosRemoved = 0
    }
  }

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

  if (autoAddLeadingZero) {
    if (cleanedText.startsWith(".")) {
      cleanedText = "0" + cleanedText
    } else if (cleanedText.startsWith("-.")) {
      cleanedText = "-0" + cleanedText.slice(1)
    }
  }

  return { cleanedText, leadingZerosRemoved }
}

export const parseNumberValue = (
  cleanedText: string
): MaybeUndefined<number> => {
  if (
    cleanedText === "" ||
    cleanedText === "-" ||
    cleanedText === "." ||
    cleanedText === "-."
  ) {
    return undefined
  }
  const parsed = parseFloat(cleanedText)
  return isNaN(parsed) ? undefined : parsed
}

