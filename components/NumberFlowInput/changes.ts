export interface Changes {
  addedIndices: Set<number>;
  unchangedIndices: Set<number>;
  barrelWheelIndices: Map<
    number,
    { sequence: string[]; direction: "up" | "down" }
  >;
}

export interface PositionChange {
  /** Index in the new formatted string */
  newIndex: number;
  /** Index in the old formatted string (-1 if new) */
  oldIndex: number;
  /** The character */
  char: string;
  /** Whether this is a separator character */
  isSeparator: boolean;
  /** Whether the character crossed a group boundary */
  crossedGroup: boolean;
}

/**
 * Check if a character is a separator (not a digit, decimal point, or minus)
 */
const isSeparator = (char: string | undefined): boolean => {
  if (!char) {
    return false;
  }
  return !/[\d.\-]/.test(char);
};

/**
 * Count separators in a string, returning a map of char -> count
 */
const countSeparators = (str: string): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const char of str) {
    if (isSeparator(char)) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }
  }
  return counts;
};

/**
 * Maps a raw (unformatted) cursor position to a formatted cursor position.
 * Counts non-separator characters up to the raw position.
 */
const mapRawPosToFormattedPos = (
  rawPos: number,
  formattedStr: string
): number => {
  let rawCount = 0;
  for (let i = 0; i < formattedStr.length; i++) {
    if (rawCount === rawPos) {
      return i;
    }
    if (!isSeparator(formattedStr[i])) {
      rawCount++;
    }
  }
  return formattedStr.length;
};

/**
 * Detects which characters in the formatted string are new vs unchanged.
 * Uses cursor position to correctly identify which specific characters are new,
 * especially important when there are repeated identical characters.
 * Special handling for separators: they only animate if they're truly new,
 * not just shifted in position.
 *
 * @param oldFormatted - The old formatted string
 * @param newFormatted - The new formatted string
 * @param rawCursorPos - Cursor position in raw (unformatted) text after the change
 * @param rawSelectionStart - Selection start in raw text before the change
 * @param rawOldLength - Length of old raw text
 */
export const getFormattedChanges = (
  oldFormatted: string,
  newFormatted: string,
  rawCursorPos?: number,
  rawSelectionStart?: number,
  rawOldLength?: number
): { addedIndices: Set<number>; unchangedIndices: Set<number> } => {
  const addedIndices = new Set<number>();
  const unchangedIndices = new Set<number>();

  if (!oldFormatted) {
    for (let i = 0; i < newFormatted.length; i++) {
      addedIndices.add(i);
    }
    return { addedIndices, unchangedIndices };
  }

  // Count separators to determine which are truly new
  const oldSeparatorCounts = countSeparators(oldFormatted);
  const newSeparatorCounts = countSeparators(newFormatted);

  const newSeparatorAmounts = new Map<string, number>();
  for (const [char, newCount] of newSeparatorCounts) {
    const oldCount = oldSeparatorCounts.get(char) ?? 0;
    const trulyNew = Math.max(0, newCount - oldCount);
    newSeparatorAmounts.set(char, trulyNew);
  }

  // Extract non-separator characters
  const oldNonSep = oldFormatted.replace(/[^\d.\-]/g, "");
  const newNonSep = newFormatted.replace(/[^\d.\-]/g, "");

  // If cursor info is provided, use position-based diff
  // This correctly handles repeated identical characters
  if (
    rawCursorPos !== undefined &&
    rawSelectionStart !== undefined &&
    rawOldLength !== undefined
  ) {
    const numInserted = newNonSep.length - oldNonSep.length;

    // Characters inserted at rawSelectionStart, cursor moved to rawCursorPos
    // So inserted characters are from rawSelectionStart to rawCursorPos (exclusive)
    const insertStartRaw = rawSelectionStart;
    const insertEndRaw = rawCursorPos;

    // Map raw positions to formatted positions
    const insertStartFormatted = mapRawPosToFormattedPos(
      insertStartRaw,
      newFormatted
    );
    const insertEndFormatted = mapRawPosToFormattedPos(
      insertEndRaw,
      newFormatted
    );

    // Track separators that should animate (truly new ones)
    // We want to animate new separators that appear in the inserted region
    const remainingNewSeparators = new Map(newSeparatorAmounts);

    for (let idx = 0; idx < newFormatted.length; idx++) {
      const char = newFormatted[idx];

      if (isSeparator(char)) {
        // For separators: animate if truly new AND in/near the insertion region
        const remaining = remainingNewSeparators.get(char ?? "") ?? 0;
        if (remaining > 0 && idx >= insertStartFormatted && idx < insertEndFormatted) {
          addedIndices.add(idx);
          remainingNewSeparators.set(char ?? "", remaining - 1);
        } else if (remaining > 0 && numInserted > 0) {
          // New separator but outside insertion region - still mark as new
          // This handles cases where separator appears due to digit insertion
          addedIndices.add(idx);
          remainingNewSeparators.set(char ?? "", remaining - 1);
        } else {
          unchangedIndices.add(idx);
        }
      } else {
        // For non-separator characters: use position-based logic
        if (idx >= insertStartFormatted && idx < insertEndFormatted) {
          // This character is in the inserted region
          addedIndices.add(idx);
        } else {
          unchangedIndices.add(idx);
        }
      }
    }

    return { addedIndices, unchangedIndices };
  }

  // Fallback: use LCS-based detection when cursor info not available
  // (This is the old behavior, kept for backwards compatibility)
  const m = oldNonSep.length;
  const n = newNonSep.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    const prevRow = dp[i - 1];
    const currentRow = dp[i];
    if (!prevRow || !currentRow) {
      continue;
    }
    for (let j = 1; j <= n; j++) {
      if (oldNonSep[i - 1] === newNonSep[j - 1]) {
        currentRow[j] = (prevRow[j - 1] ?? 0) + 1;
      } else {
        currentRow[j] = Math.max(prevRow[j] ?? 0, currentRow[j - 1] ?? 0);
      }
    }
  }

  let i = m;
  let j = n;
  const lcsNewNonSepIndices = new Set<number>();

  while (i > 0 && j > 0) {
    const prevRow = dp[i - 1];
    const currentRow = dp[i];
    if (!prevRow || !currentRow) {
      break;
    }
    if (oldNonSep[i - 1] === newNonSep[j - 1]) {
      lcsNewNonSepIndices.add(j - 1);
      i--;
      j--;
    } else if ((prevRow[j] ?? 0) > (currentRow[j - 1] ?? 0)) {
      i--;
    } else {
      j--;
    }
  }

  const nonSepIndexToFormattedIndex = new Map<number, number>();
  let nonSepIdx = 0;
  for (let idx = 0; idx < newFormatted.length; idx++) {
    if (!isSeparator(newFormatted[idx])) {
      nonSepIndexToFormattedIndex.set(nonSepIdx, idx);
      nonSepIdx++;
    }
  }

  const remainingNewSeparators = new Map(newSeparatorAmounts);

  for (let idx = 0; idx < newFormatted.length; idx++) {
    const char = newFormatted[idx];
    if (isSeparator(char)) {
      const remaining = remainingNewSeparators.get(char ?? "") ?? 0;
      if (remaining > 0) {
        addedIndices.add(idx);
        remainingNewSeparators.set(char ?? "", remaining - 1);
      } else {
        unchangedIndices.add(idx);
      }
    } else {
      let nonSepIdxForThis = -1;
      for (const [nsi, fi] of nonSepIndexToFormattedIndex) {
        if (fi === idx) {
          nonSepIdxForThis = nsi;
          break;
        }
      }

      if (nonSepIdxForThis >= 0 && lcsNewNonSepIndices.has(nonSepIdxForThis)) {
        unchangedIndices.add(idx);
      } else {
        addedIndices.add(idx);
      }
    }
  }

  return { addedIndices, unchangedIndices };
};

export const getChanges = (
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
  };

  if (!oldValue) {
    for (let i = 0; i < newValue.length; i++) {
      changes.addedIndices.add(i);
    }
    return changes;
  }

  const hadSelection = selectionStart !== selectionEnd;
  const lengthDiff = newValue.length - oldValue.length;

  if (hadSelection) {
    const numReplaced = selectionEnd - selectionStart;
    const numInserted = newCursorPos - selectionStart;
    const insertStart = selectionStart;

    if (
      numReplaced === 1 &&
      numInserted === 1 &&
      insertStart < oldValue.length &&
      insertStart < newValue.length
    ) {
      const oldChar = oldValue[insertStart];
      const newChar = newValue[insertStart];

      if (oldChar && newChar && /^\d$/.test(oldChar) && /^\d$/.test(newChar)) {
        const oldDigit = parseInt(oldChar, 10);
        const newDigit = parseInt(newChar, 10);

        if (oldDigit !== newDigit) {
          const sequence: string[] = [];
          const direction = newDigit > oldDigit ? "up" : "down";

          if (direction === "up") {
            for (let i = oldDigit; i <= newDigit; i++) {
              sequence.push(i.toString());
            }
          } else {
            for (let i = newDigit; i <= oldDigit; i++) {
              sequence.push(i.toString());
            }
          }

          changes.barrelWheelIndices.set(insertStart, { sequence, direction });
        }
      }
    }

    for (let i = 0; i < insertStart; i++) {
      if (
        i < oldValue.length &&
        i < newValue.length &&
        oldValue[i] === newValue[i]
      ) {
        changes.unchangedIndices.add(i);
      }
    }

    for (let i = insertStart; i < newCursorPos; i++) {
      if (!changes.barrelWheelIndices.has(i)) {
        changes.addedIndices.add(i);
      }
    }

    const oldAfterEnd = selectionEnd;
    const newAfterEnd = newCursorPos;
    const minLength = Math.min(
      oldValue.length - oldAfterEnd,
      newValue.length - newAfterEnd
    );

    for (let i = 0; i < minLength; i++) {
      const oldIdx = oldAfterEnd + i;
      const newIdx = newAfterEnd + i;
      if (
        oldIdx < oldValue.length &&
        newIdx < newValue.length &&
        oldValue[oldIdx] === newValue[newIdx]
      ) {
        changes.unchangedIndices.add(newIdx);
      }
    }
  } else if (lengthDiff > 0) {
    const insertPos = newCursorPos - lengthDiff;

    for (let i = 0; i < insertPos; i++) {
      if (
        i < oldValue.length &&
        i < newValue.length &&
        oldValue[i] === newValue[i]
      ) {
        changes.unchangedIndices.add(i);
      }
    }

    for (let i = insertPos; i < newCursorPos; i++) {
      changes.addedIndices.add(i);
    }

    for (let i = newCursorPos; i < newValue.length; i++) {
      const oldIdx = i - lengthDiff;
      if (
        oldIdx >= 0 &&
        oldIdx < oldValue.length &&
        oldValue[oldIdx] === newValue[i]
      ) {
        changes.unchangedIndices.add(i);
      }
    }
  } else if (lengthDiff < 0) {
    const deletePos = selectionStart;
    const numDeleted = -lengthDiff;

    for (let i = 0; i < deletePos; i++) {
      if (
        i < oldValue.length &&
        i < newValue.length &&
        oldValue[i] === newValue[i]
      ) {
        changes.unchangedIndices.add(i);
      }
    }

    for (let i = deletePos; i < newValue.length; i++) {
      const oldIdx = i + numDeleted;
      if (oldIdx < oldValue.length && oldValue[oldIdx] === newValue[i]) {
        changes.unchangedIndices.add(i);
      }
    }
  } else {
    for (let i = 0; i < newValue.length; i++) {
      if (i < oldValue.length && oldValue[i] === newValue[i]) {
        changes.unchangedIndices.add(i);
      }
    }
  }

  return changes;
};

/**
 * Get the group number for a character at a given index.
 * Groups are separated by separator characters (commas, spaces, etc.).
 * Group 0 is before the first separator, group 1 is after, etc.
 */
const getGroupNumber = (str: string, index: number): number => {
  let group = 0;
  for (let i = 0; i < index && i < str.length; i++) {
    if (isSeparator(str[i])) {
      group++;
    }
  }
  return group;
};

/**
 * Detects which characters should animate their x-position when the formatted
 * string changes. This includes:
 * - Separators that moved positions
 * - Digits that crossed group boundaries (moved past a separator)
 *
 * @returns Array of indices in the new formatted string that should animate
 */
export const getPositionChanges = (
  oldFormatted: string,
  newFormatted: string
): PositionChange[] => {
  const changes: PositionChange[] = [];

  if (!oldFormatted || !newFormatted) {
    return changes;
  }

  // Extract non-separator characters from both strings
  const oldNonSep = oldFormatted.replace(/[^\d.\-]/g, "");
  const newNonSep = newFormatted.replace(/[^\d.\-]/g, "");

  // Map each non-separator character in the new string to its position in old string
  // We use a simple matching algorithm: match from left to right for unchanged chars
  // This handles insertions and deletions correctly

  // First, find the LCS (longest common subsequence) to match characters
  const m = oldNonSep.length;
  const n = newNonSep.length;

  if (m === 0 || n === 0) {
    return changes;
  }

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    const prevRow = dp[i - 1];
    const currentRow = dp[i];
    if (!prevRow || !currentRow) {
      continue;
    }
    for (let j = 1; j <= n; j++) {
      if (oldNonSep[i - 1] === newNonSep[j - 1]) {
        currentRow[j] = (prevRow[j - 1] ?? 0) + 1;
      } else {
        currentRow[j] = Math.max(prevRow[j] ?? 0, currentRow[j - 1] ?? 0);
      }
    }
  }

  // Backtrack to find matching pairs
  // Maps new non-sep index to old non-sep index
  const newToOldNonSepIndex = new Map<number, number>();
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (oldNonSep[i - 1] === newNonSep[j - 1]) {
      newToOldNonSepIndex.set(j - 1, i - 1);
      i--;
      j--;
    } else if ((dp[i - 1]?.[j] ?? 0) > (dp[i]?.[j - 1] ?? 0)) {
      i--;
    } else {
      j--;
    }
  }

  // Build maps from non-sep index to formatted index
  const oldNonSepToFormatted = new Map<number, number>();
  let nonSepIdx = 0;
  for (let idx = 0; idx < oldFormatted.length; idx++) {
    if (!isSeparator(oldFormatted[idx])) {
      oldNonSepToFormatted.set(nonSepIdx, idx);
      nonSepIdx++;
    }
  }

  const newNonSepToFormatted = new Map<number, number>();
  nonSepIdx = 0;
  for (let idx = 0; idx < newFormatted.length; idx++) {
    if (!isSeparator(newFormatted[idx])) {
      newNonSepToFormatted.set(nonSepIdx, idx);
      nonSepIdx++;
    }
  }

  // Check each character in the new formatted string
  for (let newIdx = 0; newIdx < newFormatted.length; newIdx++) {
    const char = newFormatted[newIdx];

    if (isSeparator(char)) {
      // For separators, check if there was a separator at a different position
      // We need to find if this separator "moved" from somewhere

      // Count separators of this type before this position in both strings
      let newSepCountBefore = 0;
      for (let k = 0; k < newIdx; k++) {
        if (newFormatted[k] === char) {
          newSepCountBefore++;
        }
      }

      // Find the matching separator in old string (same type, same occurrence number)
      let oldSepCount = 0;
      let oldIdx = -1;
      for (let k = 0; k < oldFormatted.length; k++) {
        if (oldFormatted[k] === char) {
          if (oldSepCount === newSepCountBefore) {
            oldIdx = k;
            break;
          }
          oldSepCount++;
        }
      }

      // If found and positions differ, this separator moved
      if (oldIdx >= 0 && oldIdx !== newIdx && char !== undefined) {
        changes.push({
          newIndex: newIdx,
          oldIndex: oldIdx,
          char,
          isSeparator: true,
          crossedGroup: false,
        });
      }
    } else {
      // For non-separator characters, check if they crossed a group boundary
      // Find the non-sep index for this formatted index
      let newNonSepIdx = -1;
      for (const [nsi, fi] of newNonSepToFormatted) {
        if (fi === newIdx) {
          newNonSepIdx = nsi;
          break;
        }
      }

      if (newNonSepIdx >= 0) {
        const oldNonSepIdx = newToOldNonSepIndex.get(newNonSepIdx);
        if (oldNonSepIdx !== undefined) {
          const oldFormattedIdx = oldNonSepToFormatted.get(oldNonSepIdx);
          if (oldFormattedIdx !== undefined && char !== undefined) {
            // Character existed before - check if it crossed a group boundary
            const oldGroup = getGroupNumber(oldFormatted, oldFormattedIdx);
            const newGroup = getGroupNumber(newFormatted, newIdx);

            if (oldGroup !== newGroup) {
              changes.push({
                newIndex: newIdx,
                oldIndex: oldFormattedIdx,
                char,
                isSeparator: false,
                crossedGroup: true,
              });
            }
          }
        }
      }
    }
  }

  return changes;
};
