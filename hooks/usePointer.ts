import React, { useRef, useState } from 'react'
import { useEventListener } from './useEventListener'

export type PointerPosition = { x?: number; y?: number }

export const usePointer = (): PointerPosition => {
  const [pointer, setPointer] = useState<PointerPosition>({})

  useEventListener('mousemove', (e: MouseEvent): void => {
    setPointer({ x: e.clientX, y: e.clientY })
  })

  return pointer
}
