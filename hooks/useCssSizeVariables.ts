import { RefObject, useLayoutEffect } from "react";

import { Maybe } from "@/components/Media/utils/maybe";

/**
 * This hook measures the given element and add two optionally prefixed css
 * variable to it:
 * --{prefix-}block-size
 * --{prefix-}inline-size
 */
export const useCssSizeVariables = (
  ref: RefObject<Maybe<Element>> | (() => Maybe<Element>),
  options: {
    prefix?: string;
    onResize?: (size: ResizeObserverSize) => void;
    // where to inject the css variable (optional, by default will inject in the
    // element measured by the hook
    root?: RefObject<Maybe<Element>> | (() => Maybe<Element>);
  } = {}
) => {
  useLayoutEffect(() => {
    const { prefix, onResize, root } = options;
    const element = typeof ref === "function" ? ref() : ref.current;
    const rootElement = root
      ? typeof root === "function"
        ? root()
        : root.current
      : undefined;
    if (element instanceof HTMLElement) {
      const observer = new ResizeObserver((entries) => {
        const entry = entries.find((entry) => entry.target === element);
        if (entry) {
          const { blockSize, inlineSize } = entry.contentBoxSize[0] ?? {
            blockSize: 0,
            inlineSize: 0,
          };
          const computedPrefix = prefix ? `${prefix}-` : "";
          const injectCssVariablesInto =
            rootElement instanceof HTMLElement ? rootElement : element;
          const cleanCssVariablesFrom =
            rootElement instanceof HTMLElement ? element : undefined;
          injectCssVariablesInto.style.setProperty(
            `--${computedPrefix}block-size`,
            `${blockSize}px`
          );
          injectCssVariablesInto.style.setProperty(
            `--${computedPrefix}inline-size`,
            `${inlineSize}px`
          );
          cleanCssVariablesFrom?.style.removeProperty(
            `--${computedPrefix}block-size`
          );
          cleanCssVariablesFrom?.style.removeProperty(
            `--${computedPrefix}inline-size`
          );
          onResize?.({ blockSize, inlineSize });
        }
      });

      observer.observe(element);
      return () => {
        observer.disconnect();
      };
    }
  }, [options, ref]);
};
