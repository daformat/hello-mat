import { useEffect, useRef } from 'react'
export const globalWindowValue = typeof window !== 'undefined' ? window : null

type EventMap = WindowEventMap & DocumentEventMap & ElementEventMap

export const useEventListener = <K extends keyof EventMap, R = unknown>(
  eventName: K,
  handler: (event: EventMap[K]) => R,
  target: Window | Document | Element | null = globalWindowValue,
  options: boolean | AddEventListenerOptions = {}
) => {
  const savedHandler = useRef<typeof handler>()

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    if (target) {
      const eventListener = (event: EventMap[K]) =>
        savedHandler.current && savedHandler.current(event)
      target.addEventListener(
        eventName,
        eventListener as unknown as EventListener,
        options
      )
      return () => {
        target.removeEventListener(
          eventName,
          eventListener as unknown as EventListener,
          options
        )
      }
    } else {
      const tag = '[useEventListener]'
      throw new Error(
        `${tag} Couldn't attach the event ${eventName} because no target ` +
          'was given to attach it to, make sure you specify one'
      )
    }
  }, [eventName, target, options])
}
