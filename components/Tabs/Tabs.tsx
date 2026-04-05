import { Tabs as TabsPrimitive } from "radix-ui";
import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";

import styles from "./Tabs.module.scss";

const updateVars = (target: HTMLElement, tabList: HTMLElement) => {
  const parentRect = tabList.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const dimensions = {
    left: targetRect.left - parentRect.left,
    top: targetRect.top - parentRect.top,
    width: targetRect.width,
    height: targetRect.height,
  };
  tabList.style.setProperty("--active-tab-left", `${dimensions.left}px`);
  tabList.style.setProperty("--active-tab-top", `${dimensions.top}px`);
  tabList.style.setProperty("--active-tab-width", `${dimensions.width}px`);
  tabList.style.setProperty("--active-tab-height", `${dimensions.height}px`);
};

export const Tabs = ({
  tabs,
  ...props
}: {
  tabs: { id: string; trigger: ReactNode; content: ReactNode }[];
} & TabsPrimitive.TabsProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tabList = ref.current;
    if (tabList) {
      const mutationObserver = new MutationObserver((entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          if (target.dataset.state === "active") {
            updateVars(target, tabList);
          }
        });
      });
      mutationObserver.observe(tabList, {
        subtree: true,
        attributes: true,
        attributeFilter: ["data-state"],
      });
      const resizeObserver = new ResizeObserver(() => {
        const active = tabList.querySelector<HTMLElement>(
          "[data-state=active]"
        );
        if (active) {
          updateVars(active, tabList);
        }
      });
      resizeObserver.observe(tabList);
      return () => {
        mutationObserver.disconnect();
        resizeObserver.disconnect();
      };
    }
  }, []);

  useLayoutEffect(() => {
    const tabList = ref.current;
    if (tabList) {
      const active = tabList.querySelector<HTMLElement>("[data-state=active]");
      if (active) {
        updateVars(active, tabList);
      }
    }
  }, []);

  return (
    <TabsPrimitive.Root {...props} className={styles.tabs}>
      <TabsPrimitive.List ref={ref} className={styles.list}>
        {tabs.map((tab) => {
          return (
            <TabsPrimitive.Trigger
              key={tab.id}
              value={tab.id}
              className={styles.trigger}
            >
              {tab.trigger}
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
      {tabs.map((tab) => {
        return (
          <TabsPrimitive.Content
            key={tab.id}
            value={tab.id}
            className={styles.content}
            tabIndex={-1}
          >
            {tab.content}
          </TabsPrimitive.Content>
        );
      })}
    </TabsPrimitive.Root>
  );
};
