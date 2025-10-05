import { PropsWithChildren, ReactNode, useEffect, useRef } from "react"

import styles from "./Dock.module.scss"
import { MaybeUndefined } from "../Media/utils/maybe"

let focusGuard: MaybeUndefined<HTMLElement> = undefined
let focusSource: MaybeUndefined<"keyboard" | "pointer"> = undefined
const pointer = { x: 0, y: 0 }

export const Dock = ({ children }: PropsWithChildren) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dock = ref.current
    if (dock) {
      const observer = new ResizeObserver(() => {
        const hovered = dock.matches(":hover,:has(*:hover),:focus-within")
        const animations = dock.getAnimations({ subtree: true })
        if (!hovered && animations.length === 0) {
          dock.style.maxHeight = "initial"
          const { width, height } = dock.getBoundingClientRect()
          dock.style.setProperty("--dock-width", `${width}`)
          dock.style.setProperty("--dock-height", `${height}`)
          dock.style.maxHeight = ""
        }
      })
      observer.observe(dock)
      return () => observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const dock = ref.current
    let raf: ReturnType<typeof requestAnimationFrame>
    if (dock) {
      const handlePointerMove = (event: PointerEvent) => {
        const { clientX: x, target } = event
        if (
          focusSource === "keyboard" &&
          focusGuard &&
          !focusGuard.contains(target as Node)
        ) {
          return
        }
        // cancelAnimationFrame(raf)
        const icons = Array.from(
          dock.querySelectorAll("[data-dock-item]")
        ) as HTMLButtonElement[]
        const animating = dock.getAnimations({ subtree: true })
        if (animating.length > 0) {
          return
        }
        ;[...icons, ...icons].forEach((icon) => {
          const box = icon.getBoundingClientRect()
          let distance = 0
          const offset = 0.25
          const before = box.x + (box.width / 2) * offset
          const after = box.x + box.width - (box.width / 2) * offset
          if (x < before || x > after) {
            const edge = x < before ? before : after
            distance = Math.abs(edge - x)
          }
          const spread = 2.5
          const iconMinSize = dock.offsetHeight - 14
          const iconMaxSize = iconMinSize * 2 // min size * max grow factor
          const distanceMax = ((iconMaxSize + iconMinSize) / 2) * spread
          const scaleFactor =
            distance < distanceMax ? 1 - distance / distanceMax : 0
          const targetSize =
            iconMinSize + (iconMaxSize - iconMinSize) * scaleFactor
          icon.style.setProperty("--size", `${targetSize}px`)
          icon.style.setProperty("--target-size", `${targetSize}px`)
        })
        if (focusGuard) {
          setTimeout(() => {
            focusGuard = undefined
          }, 150)
        }
      }

      const handlePointerLeave = () => {
        const icons = Array.from(
          dock.querySelectorAll("[data-dock-item]")
        ) as HTMLButtonElement[]
        cancelAnimationFrame(raf)
        icons.forEach((icon) => {
          icon.style.removeProperty("--size")
          icon.style.transition =
            "width 0.2s var(--ease-out-cubic), height 0.2s var(--ease-out-cubic)"
        })
        const focusedIcon = dock.querySelector("[data-dock-item]:focus")
        if (focusedIcon instanceof HTMLElement) {
          focusedIcon.blur()
        }
        if (focusSource !== "keyboard") {
          focusSource = undefined
        }
      }

      const easeOut = (t: number) => {
        return 1 - Math.pow(1 - t, 5)
      }

      const handlePointerEnter = () => {
        focusGuard = undefined
        const icons = Array.from(
          dock.querySelectorAll("[data-dock-item]")
        ) as HTMLButtonElement[]
        icons.forEach((icon) => {
          icon.style.setProperty("--initial-size", icon.offsetHeight + "px")
          icon.style.transition = ""
        })
        const startTime = Date.now()
        const duration = 150

        if (raf) {
          cancelAnimationFrame(raf)
        }

        const update = () => {
          const currentTime = Date.now()
          const elapsedTime = currentTime - startTime
          const progress = Math.min(elapsedTime / duration, 1)
          const easedProgress = easeOut(progress)

          const icons = Array.from(
            dock.querySelectorAll("[data-dock-item]")
          ) as HTMLButtonElement[]
          let needsUpdate = false
          icons.forEach((icon) => {
            const computedStyle = getComputedStyle(icon)
            const size = parseFloat(
              computedStyle.getPropertyValue("--initial-size") || "0"
            )
            const targetSize = parseFloat(
              computedStyle.getPropertyValue("--target-size") || "0"
            )
            const delta = targetSize - size
            icon.style.setProperty(
              "--size",
              `${size + delta * easedProgress}px`
            )
            if (easedProgress < 1) {
              needsUpdate = true
            }
          })
          if (needsUpdate) {
            raf = requestAnimationFrame(update)
          }
        }

        update()
      }

      const handleFocus = (event: FocusEvent) => {
        const target = event.target
        if (target instanceof HTMLElement && focusSource == "keyboard") {
          // trigger pointer move event on dock
          const { x, y, width, height } = target.getBoundingClientRect()
          focusGuard = target
          target.dispatchEvent(
            new PointerEvent("pointermove", {
              clientX: x + width / 2,
              clientY: y + height / 2,
            })
          )
        }
      }

      const handleBlur = () => {
        const isFocused = dock.matches(":focus-within")
        if (!isFocused) {
          dock.dispatchEvent(new PointerEvent("pointerleave"))
          const element = document.elementFromPoint(pointer.x, pointer.y)
          if (element instanceof Element && dock.contains(element)) {
            const icons = Array.from(
              dock.querySelectorAll("[data-dock-item]")
            ) as HTMLButtonElement[]
            icons.forEach((icon) => {
              icon.style.transition = ""
            })
            // const item = element.closest("[data-dock-item]")
            // if (item instanceof HTMLElement) {
            //   focusSource = "keyboard"
            //   focusGuard = item
            //   item.focus()
            // }
            // dock.dispatchEvent(
            //   new PointerEvent("pointerenter", {
            //     clientX: pointer.x,
            //     clientY: pointer.y,
            //   })
            // )
            // dock.dispatchEvent(
            //   new PointerEvent("pointermove", {
            //     clientX: pointer.x,
            //     clientY: pointer.y,
            //   })
            // )
            // element.dispatchEvent(
            //   new PointerEvent("pointerenter", {
            //     clientX: pointer.x,
            //     clientY: pointer.y,
            //   })
            // )
            focusSource = undefined
          } else {
            focusSource = undefined
          }
        }
      }

      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === "Tab") {
          focusSource = "keyboard"
          handlePointerEnter()
        }
      }

      const handleGlobalPointerMove = (event: PointerEvent) => {
        pointer.x = event.clientX
        pointer.y = event.clientY
      }

      dock.addEventListener("pointermove", handlePointerMove, { capture: true })
      dock.addEventListener("pointerleave", handlePointerLeave)
      dock.addEventListener("pointerenter", handlePointerEnter)
      dock.addEventListener("focus", handleFocus, { capture: true })
      dock.addEventListener("blur", handleBlur, { capture: true })
      document.addEventListener("keydown", handleKeydown)
      document.addEventListener("pointermove", handleGlobalPointerMove)
      return () => {
        dock.removeEventListener("pointermove", handlePointerMove, {
          capture: true,
        })
        dock.removeEventListener("pointerleave", handlePointerLeave)
        dock.removeEventListener("pointerenter", handlePointerEnter)
        dock.removeEventListener("focus", handleFocus, { capture: true })
        dock.removeEventListener("blur", handleBlur, { capture: true })
        document.removeEventListener("keydown", handleKeydown)
        document.removeEventListener("pointermove", handleGlobalPointerMove)
      }
    }
  }, [])
  return (
    <div ref={ref} className={styles.dock}>
      {children}
    </div>
  )
}

export const DockItem = ({
  icon,
  name,
}: {
  icon: string | ReactNode
  name: string
}) => {
  // const ref = useRef<HTMLButtonElement>(null)
  //
  // useEffect(() => {
  //   const item = ref.current
  //   if (item) {
  //     const observer = new ResizeObserver((entries) => {
  //       for (const entry of entries) {
  //         const { width, height } = entry.contentRect
  //         item.style.setProperty("--item-width", `${width}px`)
  //         item.style.setProperty("--item-height", `${height}px`)
  //       }
  //     })
  //     observer.observe(item)
  //     return () => observer.disconnect()
  //   }
  // }, [])

  const finalIcon =
    typeof icon === "string" ? <img src={icon} alt={name} /> : icon
  return (
    <button
      className={styles.dock_item}
      onPointerEnter={(event) => {
        if (!focusGuard) {
          focusSource = "pointer"
          event.currentTarget.focus()
        }
      }}
      data-dock-item
    >
      {finalIcon}
      <span className={styles.label}>{name}</span>
    </button>
  )
}
