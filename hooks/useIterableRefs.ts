import { useCallback, useRef } from "react";

export type IterableRefsMapKey = string | number;

/**
 * Allows handling refs when iterating (for instance, when using `items.map(...)`)
 */
export const useIterableRefs = <T = unknown>() => {
  const refs = useRef<Map<IterableRefsMapKey, T>>(new Map());

  // Ref callback to update our ref map with the given item ref
  const getRef = useCallback(
    (id: IterableRefsMapKey) => (node: T) => {
      const map = refs.current;
      if (node) {
        map.set(id, node);
      } else {
        map.delete(id);
      }
    },
    []
  );

  return { refs: refs.current, getRef };
};
