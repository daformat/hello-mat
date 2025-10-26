import { CSSProperties, useMemo, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import styles from "./SwipeableCards.module.scss"
import { cssEasing } from "@/utils/cssEasing"

export const SwipeableCards = ({
  cards,
  visibleStackLength,
}: {
  cards: JSX.Element[]
  visibleStackLength: number
}) => {
  const cardsWithId = useMemo(
    () => cards.map((card) => ({ id: uuidv4(), card })).reverse(),
    [cards]
  )
  const [stack, setStack] = useState(cardsWithId)
  const cardsTopDistance = "clamp(16px, 1vw, 32px)"
  const [discardedCardId, setDiscardedCardId] = useState<string>("")
  const dragStateRef = useRef({
    dragging: false,
    draggingId: "",
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    currentX: 0,
    currentY: 0,
    velocityX: 0,
    velocityY: 0,
    lastTime: 0,
  })

  return (
    <div
      className={styles.swipeable_cards}
      style={
        {
          "--visible-stack-length": visibleStackLength,
          "--stack-length": stack.length,
          "--card-top-distance": cardsTopDistance,
        } as CSSProperties
      }
    >
      {stack.map((card, index) => {
        const isBeingDiscarded = discardedCardId === card.id
        const isDiscarding = !!discardedCardId
        const stackIndex =
          stack.length - (index + (isDiscarding && !isBeingDiscarded ? 1 : 0))
        const stackIndex0 = stackIndex - 1
        return (
          <div
            key={card.id}
            className={styles.card}
            style={
              {
                "--stack-index": stackIndex,
                "--stack-index0": stackIndex0,
              } as CSSProperties
            }
            onDragStart={(event) => {
              event.preventDefault()
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              const dragState = dragStateRef.current
              dragState.dragging = true
              dragState.startX = event.clientX
              dragState.startY = event.clientY
              dragState.lastX = event.clientX
              dragState.lastY = event.clientY
              dragState.velocityX = 0
              dragState.velocityY = 0
              dragState.lastTime = Date.now()
              dragState.draggingId = card.id
            }}
            onPointerMove={(event) => {
              const state = dragStateRef.current
              if (!state.dragging || state.draggingId !== card.id) {
                return
              }
              const maxAbsoluteVelocity = 1000
              const currentTime = Date.now()
              const deltaTime = currentTime - state.lastTime
              const deltaX = event.clientX - state.lastX
              const deltaY = event.clientY - state.lastY
              if (deltaTime > 0) {
                state.velocityX = deltaX / deltaTime // (pixels per millisecond)
                if (Math.abs(state.velocityX) > maxAbsoluteVelocity) {
                  state.velocityX =
                    Math.sign(state.velocityX) * maxAbsoluteVelocity
                }
                state.velocityY = deltaY / deltaTime // (pixels per millisecond)
                if (Math.abs(state.velocityY) > maxAbsoluteVelocity) {
                  state.velocityY =
                    Math.sign(state.velocityY) * maxAbsoluteVelocity
                }
              }
              state.lastX = event.clientX
              state.lastY = event.clientY
              state.lastTime = currentTime
              event.currentTarget.style.translate = `${
                state.lastX - state.startX
              }px ${state.lastY - state.startY}px`
            }}
            onPointerUp={(event) => {
              console.log("pointerup", { ...dragStateRef.current })
              const state = dragStateRef.current
              state.dragging = false
              state.draggingId = ""
              const { currentTarget } = event
              if (
                Math.abs(state.velocityX) < 0.5 &&
                Math.abs(state.velocityY) < 0.5 &&
                Math.abs(state.startX - state.lastX) < 10 &&
                Math.abs(state.startY - state.lastY) < 10
              ) {
                return
              }
              setDiscardedCardId(card.id)
              const distanceX = state.velocityX * 200
              const distanceY = state.velocityY * 200
              // if (Math.abs(state.velocityX) < 0.5 &&
              //   Math.abs(state.velocityY) < 0.5) {
              //   distanceX =
              // }
              const animation = event.currentTarget.animate(
                {
                  opacity: [0],
                  translate: [`${distanceX}px ${distanceY}px`],
                },
                {
                  duration: 200,
                  easing: cssEasing["--ease-out-cubic"],
                  fill: "forwards",
                }
              )
              animation.onfinish = () => {
                setDiscardedCardId("")
                setStack((prev) => {
                  if (prev.length === 0) {
                    return prev
                  }
                  const last = prev[prev.length - 1]
                  return [last, ...prev.slice(0, -1)]
                })
                setTimeout(() => {
                  animation.cancel()
                  currentTarget.style.translate = ""
                })
              }
            }}
            onClick={(event) => {}}
          >
            {card.card}
          </div>
        )
      })}
    </div>
  )
}
