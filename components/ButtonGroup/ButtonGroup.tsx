import React, { Fragment, useEffect, useRef, useState } from "react"
import { Dropdown } from "./Dropdown/Dropdown"
import {
  IterableRefsMapKey,
  useIterableRefs,
} from "../../hooks/useIterableRefs"

import styles from "./ButtonGroup.module.scss"

export type NotCollapsibleButtonGroupButton = {
  id: string
  button: React.ReactNode
}

export type CollapsibleButtonGroupButton = NotCollapsibleButtonGroupButton & {
  menuItem: React.ReactNode
}

export type NotCollapsibleButtonGroupProps = {
  buttons: NotCollapsibleButtonGroupButton[]
  collapsible?: never | false
  dropdownTrigger?: never
}

export type CollapsibleButtonGroupProps = {
  buttons: CollapsibleButtonGroupButton[]
  collapsible: true
  dropdownTrigger: React.ReactNode
}

export type ButtonGroupProps =
  | NotCollapsibleButtonGroupProps
  | CollapsibleButtonGroupProps

export const ButtonGroup = ({
  buttons,
  collapsible,
  dropdownTrigger,
}: ButtonGroupProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { refs: itemsRefs, getRef } = useIterableRefs<HTMLDivElement>()
  const overflowingItems = useRef<Set<IterableRefsMapKey>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState<number>(0)
  const lastContainerWidth = useRef<number | null>(null)

  // Setup resize observer
  useEffect(() => {
    const hide = (item: HTMLElement) => {
      item.style.transform = "scale(0)"
      item.style.opacity = "0"
    }

    const show = (item: HTMLElement) => {
      item.style.transform = "scale(1)"
      item.style.opacity = "1"
    }

    if (!collapsible) {
      ;[...overflowingItems.current.values()].forEach((id) => {
        const item = itemsRefs.get(id)
        if (item) {
          show(item)
        }
      })
      overflowingItems.current.clear()
      setOverflows(0)
      return
    }

    // Mark an item as overflowing or not and update its style accordingly
    const checkAndUpdateOverflow = (
      id: IterableRefsMapKey,
      item: HTMLElement,
      xEdge: number
    ) => {
      const overflowingItemsSet = overflowingItems.current
      if (item.offsetLeft + item.offsetWidth > xEdge) {
        overflowingItemsSet.add(id)
        hide(item)
      } else {
        overflowingItemsSet.delete(id)
        show(item)
      }
    }

    // Update overflowing items
    const update = () => {
      const container = containerRef.current
      const overflowingItemsSet = overflowingItems.current
      const dropdownElement = dropdownRef.current
      if (container && dropdownElement) {
        const containerBbox = container.getBoundingClientRect()
        // Separate the last and remaining items
        const otherItems = [...itemsRefs.entries()]
        const lastItemValue = otherItems.pop()
        if (lastItemValue) {
          const [lastItemId, lastItem] = lastItemValue
          checkAndUpdateOverflow(
            lastItemId,
            lastItem,
            Math.ceil(containerBbox.width)
          )
        }
        otherItems.forEach(([id, item]) => {
          checkAndUpdateOverflow(
            id,
            item,
            containerBbox.width - dropdownElement.offsetWidth ?? 0
          )
        })
        setOverflows(overflowingItemsSet.size)
        lastContainerWidth.current = containerBbox.width
      }
    }

    const container = containerRef.current
    if (container) {
      const observer = new ResizeObserver(update)
      observer.observe(container)
      return () => observer.disconnect()
    }
  }, [collapsible, itemsRefs])

  useEffect(() => {
    const container = containerRef.current
    const dropdownElement = dropdownRef.current
    if (container && dropdownElement) {
      container.style.minWidth = `${dropdownElement.offsetWidth}px`
    }
  }, [])
  // const dropdownTrigger = (
  //   <ItemButton>
  //     <FaAnglesRight />
  //   </ItemButton>
  // )

  const dropdownItems = overflows
    ? buttons
        .filter((button) => overflowingItems.current.has(button.id))
        .map((button) => (
          <Fragment key={button.id}>
            {(button as CollapsibleButtonGroupButton).menuItem}
          </Fragment>
        ))
    : null

  return (
    <div className={styles.button_group} ref={containerRef}>
      {buttons.map(({ id, button }) => (
        <div className={styles.button} key={id} ref={getRef(id)}>
          {button}
        </div>
      ))}
      {collapsible ? (
        <div
          className={styles.dropdown}
          ref={dropdownRef}
          data-state={!!overflows ? "visible" : "hidden"}
        >
          {overflows ? (
            <Dropdown
              modal={false}
              contentProps={{
                style: { minWidth: 200 },
                align: "start",
                sideOffset: 5,
              }}
              trigger={dropdownTrigger}
            >
              {dropdownItems}
            </Dropdown>
          ) : (
            dropdownTrigger
          )}
        </div>
      ) : null}
    </div>
  )
}

// const StyledButtonGroup = styled.div`
//   display: flex;
//   flex-direction: row;
//   flex-shrink: 1;
//   gap: 2px;
//   min-width: 33px;
//   overflow: hidden;
//   position: relative;
// `
//
// const ButtonGroupButton = styled.div`
//   transition: transform 0.15s ease-in-out, opacity 0.15s ease-in-out;
// `
//
// type ButtonGroupDropdownProps = { visible: boolean }
//
// const ButtonGroupDropdown = styled.div<ButtonGroupDropdownProps>`
//   --animation-start-translate: 200%;
//
//   ${({ visible }) =>
//     visible
//       ? css`
//           animation: ${fadeIn} 0.25s ease-in-out, ${scaleIn} 0.25s ease-in-out,
//             ${translateIn} 0.25s ease-in-out;
//         `
//       : ""};
//   bottom: 0;
//   position: absolute;
//   right: 0;
//   top: 0;
//   visibility: ${({ visible }) => (visible ? "visible" : "hidden")};
// `
