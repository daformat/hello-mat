import {
  createContext,
  MouseEventHandler,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import styles from "./TocComponent.module.scss";

const TocContext = createContext<{
  rootElement: HTMLElement | null;
  setRootElement: (rootElement: HTMLElement) => void;
}>({ rootElement: null, setRootElement: () => undefined });

const TocContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);
  return (
    <TocContext.Provider value={{ rootElement, setRootElement }}>
      {children}
    </TocContext.Provider>
  );
};

type HeadingWithChildren = {
  heading: HTMLHeadingElement;
  level: number; // the topographical level (not the heading level)
  children: HeadingWithChildren[];
};

function buildTopographicalMap(
  headings: HTMLHeadingElement[]
): HeadingWithChildren[] {
  if (headings.length === 0) {
    return [];
  }

  const result: HeadingWithChildren[] = [];
  const stack: HeadingWithChildren[] = [];

  for (const heading of headings) {
    const headingLevel = parseInt(heading.tagName.charAt(1));
    const newNode: HeadingWithChildren = {
      heading,
      level: 0, // Will be set correctly when we determine its position
      children: [],
    };

    // Find the correct parent by popping elements from stack
    // until we find a heading with a level less than current heading
    while (stack.length > 0) {
      const lastInStack = stack[stack.length - 1];
      const lastHeadingLevel = lastInStack
        ? parseInt(lastInStack.heading.tagName.charAt(1))
        : 1;

      if (lastHeadingLevel < headingLevel) {
        // Found the parent
        break;
      }
      stack.pop();
    }

    // Set the level based on depth in the tree
    newNode.level = stack.length;

    // Add to parent's children or root
    const lastInStack = stack[stack.length - 1];
    if (stack.length === 0) {
      result.push(newNode);
    } else if (lastInStack) {
      lastInStack.children.push(newNode);
    }

    // Push current node to stack
    stack.push(newNode);
  }

  return result;
}

const TocElement = ({ entry }: { entry: HeadingWithChildren }) => {
  const safeText = entry.heading.innerText;
  const children = (
    <ul>
      {entry.children.map((c, i) => (
        <TocElement entry={c} key={c.heading.id || i} />
      ))}
    </ul>
  );

  const fallbackClickHandler = useCallback<
    MouseEventHandler<HTMLLIElement | HTMLAnchorElement>
  >(
    (event) => {
      if (event.target === event.currentTarget) {
        entry.heading.scrollIntoView({ block: "start" });
        entry.heading.dispatchEvent(new Event("target"));
        entry.heading.classList.add("targeted");
        entry.heading.addEventListener(
          "animationend",
          () => {
            entry.heading.classList.remove("targeted");
          },
          { once: true }
        );
        if (entry.heading.id) {
          location.hash = entry.heading.id;
        }
      }
    },
    [entry.heading]
  );

  return (
    <li
      className={styles[`level_${entry.level ? entry.level : "level_1"}`]}
      data-type={`${entry.level ? entry.level : ""}`}
      data-text={safeText ?? ""}
      data-id={`${entry.heading.id ? entry.heading.id : ""}`}
      onClick={fallbackClickHandler}
    >
      <a
        href={entry.heading.id ? `#${entry.heading.id}` : undefined}
        onClick={(event) => {
          if (!entry.heading.id) {
            fallbackClickHandler(event);
          }
        }}
      >
        {safeText}
      </a>
      {children}
    </li>
  );
};

export const TocRoot = () => {
  const [_v, setV] = useState<number>(0);
  const context = useContext(TocContext);
  if (!context) {
    throw new Error("TocRoot must be used within a TocContextProvider");
  }

  const headings = Array.from(
    context.rootElement?.querySelectorAll(
      "*:is(h1,h2,h3,h4,h5,h6):not([data-no-toc])"
    ) ?? []
  ) as HTMLHeadingElement[];

  const topographicalMap = buildTopographicalMap(headings);

  useEffect(() => {
    if (context.rootElement) {
      const observer = new MutationObserver(() => {
        setV((prev) => prev + 1);
      });
      observer.observe(context.rootElement, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, [context.rootElement]);

  return (
    <aside className={styles.toc}>
      <ul>
        {topographicalMap.map((entry, i) => (
          <TocElement entry={entry} key={entry.heading.id || i} />
        ))}
      </ul>
    </aside>
  );
};

export const TableOfContents = {
  Root: TocRoot,
  Provider: TocContextProvider,
  useToc: () => useContext(TocContext),
};
