import { PropsWithChildren, ReactNode, useEffect, useRef } from "react"

import styles from "./Dock.module.scss"

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
        const { clientX: x } = event
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
      }

      const easeOut = (t: number) => {
        return 1 - Math.pow(1 - t, 5)
      }

      const handlePointerEnter = () => {
        const icons = Array.from(
          dock.querySelectorAll("[data-dock-item]")
        ) as HTMLButtonElement[]
        icons.forEach((icon) => {
          icon.style.setProperty("--initial-size", icon.offsetHeight + "px")
          icon.style.transition = ""
        })
        const startTime = Date.now()
        const duration = 150

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

      dock.addEventListener("pointermove", handlePointerMove)
      dock.addEventListener("pointerleave", handlePointerLeave)
      dock.addEventListener("pointerenter", handlePointerEnter)
      return () => {
        dock.removeEventListener("pointermove", handlePointerMove)
        dock.removeEventListener("pointerleave", handlePointerLeave)
        dock.removeEventListener("pointerenter", handlePointerEnter)
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
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const item = ref.current
    if (item) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          item.style.setProperty("--item-width", `${width}px`)
          item.style.setProperty("--item-height", `${height}px`)
        }
      })
      observer.observe(item)
      return () => observer.disconnect()
    }
  }, [])

  const finalIcon =
    typeof icon === "string" ? <img src={icon} alt={name} /> : icon
  return (
    <button className={styles.dock_item} data-dock-item>
      {finalIcon}
      <span>{name}</span>
    </button>
  )
}
