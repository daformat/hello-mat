import { CSSProperties, useMemo, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import styles from "./SwipeableCards.module.scss"
import { cssEasing } from "@/utils/cssEasing"

const rotationFactor = 0.1

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
    pivotX: 0,
    pivotY: 0,
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
              const rect = event.currentTarget.getBoundingClientRect()
              const centerX = rect.left + rect.width / 2
              const centerY = rect.top + rect.height / 2

              dragState.dragging = true
              dragState.startX = event.clientX
              dragState.startY = event.clientY
              dragState.lastX = event.clientX
              dragState.lastY = event.clientY
              dragState.velocityX = 0
              dragState.velocityY = 0
              dragState.lastTime = Date.now()
              dragState.draggingId = card.id
              dragState.pivotX = event.clientX - centerX
              dragState.pivotY = event.clientY - centerY
              console.log(rect, centerX, centerY)
              event.currentTarget.style.transformOrigin = `${
                event.clientX - rect.left
              }px ${event.clientY - rect.top}px`
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

              const translateX = state.lastX - state.startX
              const translateY = state.lastY - state.startY

              // Calculate rotation based on horizontal movement and pivot point
              // The further from center the pivot is, the more rotation per pixel moved
              const rotation =
                ((translateX * state.pivotY - translateY * state.pivotX) *
                  rotationFactor) /
                100

              console.log(state.pivotX, state.pivotY)
              event.currentTarget.style.translate = `${translateX}px ${translateY}px`
              event.currentTarget.style.rotate = `${rotation}deg`
            }}
            onPointerUp={(event) => {
              console.log("pointerup")
              const state = dragStateRef.current
              state.dragging = false
              state.draggingId = ""
              const { currentTarget } = event
              if (currentTarget.hasPointerCapture(event.pointerId)) {
                currentTarget.releasePointerCapture(event.pointerId)
              }
              if (
                Math.abs(state.velocityX) < 0.5 &&
                Math.abs(state.velocityY) < 0.5 &&
                Math.abs(state.startX - state.lastX) < 10 &&
                Math.abs(state.startY - state.lastY) < 10
              ) {
                currentTarget.style.transform = ""
                currentTarget.style.translate = ""
                currentTarget.style.rotate = ""
                currentTarget.style.transformOrigin = ""
                return
              }
              setDiscardedCardId(card.id)
              const distanceX = state.velocityX * 200
              const distanceY = state.velocityY * 200

              // Calculate final rotation based on velocity and pivot
              const currentTranslateX = state.lastX - state.startX
              const currentTranslateY = state.lastY - state.startY
              const currentRotation =
                ((currentTranslateX * state.pivotY -
                  currentTranslateY * state.pivotX) *
                  rotationFactor) /
                100
              const finalRotation =
                currentRotation +
                ((distanceX * state.pivotY - distanceY * state.pivotX) *
                  rotationFactor) /
                  100

              const animation = event.currentTarget.animate(
                {
                  opacity: [0],
                  transform: [
                    `translate(${distanceX}px, ${distanceY}px) rotate(${finalRotation}deg)`,
                  ],
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
                  currentTarget.style.transform = ""
                  currentTarget.style.translate = ""
                  currentTarget.style.rotate = ""
                  currentTarget.style.transformOrigin = ""
                })
              }
            }}
            onPointerCancel={(event) => {
              console.log("pointercancel")
              const state = dragStateRef.current
              state.dragging = false
              state.draggingId = ""

              // Release pointer capture
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }

              // Reset the card position
              event.currentTarget.style.translate = ""
              event.currentTarget.style.rotate = ""
              event.currentTarget.style.transform = ""
              event.currentTarget.style.transformOrigin = ""
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
