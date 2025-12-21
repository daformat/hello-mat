export interface Changes {
  addedIndices: Set<number>
  unchangedIndices: Set<number>
  barrelWheelIndices: Map<
    number,
    { sequence: string[]; direction: "up" | "down" }
  >
}

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
    const numReplaced = selectionEnd - selectionStart
    const numInserted = newCursorPos - selectionStart
    const insertStart = selectionStart

    if (
      numReplaced === 1 &&
      numInserted === 1 &&
      insertStart < oldValue.length &&
      insertStart < newValue.length
    ) {
      const oldChar = oldValue[insertStart]
      const newChar = newValue[insertStart]

      if (oldChar && newChar && /^\d$/.test(oldChar) && /^\d$/.test(newChar)) {
        const oldDigit = parseInt(oldChar, 10)
        const newDigit = parseInt(newChar, 10)

        if (oldDigit !== newDigit) {
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

    for (let i = 0; i < insertStart; i++) {
      if (
        i < oldValue.length &&
        i < newValue.length &&
        oldValue[i] === newValue[i]
      ) {
        changes.unchangedIndices.add(i)
      }
    }

    for (let i = insertStart; i < newCursorPos; i++) {
      if (!changes.barrelWheelIndices.has(i)) {
        changes.addedIndices.add(i)
      }
    }

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
    const insertPos = newCursorPos - lengthDiff

    for (let i = 0; i < insertPos; i++) {
      if (
        i < oldValue.length &&
        i < newValue.length &&
        oldValue[i] === newValue[i]
      ) {
        changes.unchangedIndices.add(i)
      }
    }

    for (let i = insertPos; i < newCursorPos; i++) {
      changes.addedIndices.add(i)
    }

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
    const deletePos = selectionStart
    const numDeleted = -lengthDiff

    for (let i = 0; i < deletePos; i++) {
      if (
        i < oldValue.length &&
        i < newValue.length &&
        oldValue[i] === newValue[i]
      ) {
        changes.unchangedIndices.add(i)
      }
    }

    for (let i = deletePos; i < newValue.length; i++) {
      const oldIdx = i + numDeleted
      if (oldIdx < oldValue.length && oldValue[oldIdx] === newValue[i]) {
        changes.unchangedIndices.add(i)
      }
    }
  } else {
    for (let i = 0; i < newValue.length; i++) {
      if (i < oldValue.length && oldValue[i] === newValue[i]) {
        changes.unchangedIndices.add(i)
      }
    }
  }

  return changes
}
