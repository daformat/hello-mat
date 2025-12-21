import { CSSProperties, PropsWithChildren, useEffect, useRef } from "react";

import { useCssSizeVariables } from "@/hooks/useCssSizeVariables";

import styles from "./RollingStackedCards.module.scss";

export const RollingStackedCards = ({
  cards,
  topDistance,
  topOffset,
  cardHeight,
  cardMargin,
  cardPadding,
  gap,
  rollingCount,
  discardAnimationName = styles.discard,
  stackAnimationName = styles.scale,
}: {
  cards: JSX.Element[];
  topDistance: string;
  topOffset: string;
  cardHeight: string;
  cardMargin: string;
  cardPadding: string;
  gap: string;
  rollingCount: number;
  discardAnimationName?: string;
  stackAnimationName?: string;
}) => {
  const cardsRootRef = useRef<HTMLDivElement>(null);
  useCssSizeVariables(cardsRootRef);

  useEffect(() => {
    const root = cardsRootRef.current;
    if (!root) {
      return;
    }

    const handleScroll = () => {
      if (root) {
        const cards = Array.from(root.querySelectorAll("[data-card]"));
        const discardedCards: HTMLElement[] = [];
        const remainingCards: HTMLElement[] = [];
        const discardedScaleMap = new WeakMap<HTMLElement, number>();
        cards.forEach((card) => {
          if (card instanceof HTMLElement) {
            const scale = getComputedStyle(card).scale;
            discardedScaleMap.set(card, parseFloat(scale));
            if (scale !== "none") {
              discardedCards.push(card);
            } else {
              remainingCards.push(card);
            }
          }
        });
        const discardedAmount = discardedCards.length;
        const lastDiscarded = discardedCards[discardedAmount - 1];
        const lastDiscardedScale = lastDiscarded
          ? discardedScaleMap.get(lastDiscarded)
          : 1;
        const discardedRatio = lastDiscardedScale
          ? 1 - (lastDiscardedScale - 0.78) / 0.22
          : 0;
        root.style.setProperty("--discarded-amount", `${discardedAmount}`);
        root.style.setProperty("--discarded-ratio", `${discardedRatio}`);
        cards.forEach((card) => {
          if (card instanceof HTMLElement) {
            const prevDiscarded = Math.max(discardedAmount - 1, 0);
            card.style.paddingTop = `calc(var(--card-top-distance) + (var(--index0) - ${prevDiscarded} - ${
              discardedAmount ? discardedRatio : 0
            }) * var(--card-top-offset))`;
          }
        });
      }
    };

    // We need to force reflow to properly trigger the animations when resizing
    const handleResize = () => {
      const animationElements = root.querySelectorAll("[data-animates]");
      animationElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          const prevAnimation = element.style.animationName;
          if (prevAnimation) {
            element.style.animationName = "none";
            const _ = element.offsetHeight;
            element.style.animationName = prevAnimation;
            const __ = element.offsetHeight;
          }
        }
      });
      handleScroll();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    document.addEventListener("scroll", handleScroll);
    resizeObserver.observe(root);
    return () => {
      document.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  const NestedStackContainer = ({
    children,
    cardIndex,
    depth,
    currentDepth = 1,
  }: PropsWithChildren<{
    cardIndex: number;
    depth: number;
    currentDepth?: number;
  }>) => {
    const remainingCards = cards.length - cardIndex - 1;
    const isValid = currentDepth <= remainingCards;

    const wrapped = (
      <div
        data-animates={""}
        style={
          {
            "--cards-length": `${cards.length}`,
            "--card-index": `${cardIndex}`,
            "--card-depth": `${depth}`,
            "--card-current-depth": `${currentDepth}`,
            "--card-min-value": `${Math.min(cards.length - 1 - cardIndex)}`,
            "--start-range": `calc((var(--index0) + ${Math.min(
              cards.length - 1 - cardIndex,
              currentDepth - 1
            )}) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)`,
            "--end-range": `calc((var(--index) + ${Math.min(
              cards.length - 1 - cardIndex,
              currentDepth - 1
            )}) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)`,
            animation:
              remainingCards >= rollingCount || isValid
                ? `${stackAnimationName} linear forwards`
                : undefined,
            animationTimeline: "--cards-scrolling",
            animationRange:
              "exit-crossing var(--start-range) exit-crossing var(--end-range)",
            transformOrigin: "50% 0%",
          } as CSSProperties
        }
      >
        {children}
      </div>
    );

    return depth > currentDepth ? (
      <NestedStackContainer
        depth={depth}
        currentDepth={currentDepth + 1}
        cardIndex={cardIndex}
      >
        {wrapped}
      </NestedStackContainer>
    ) : (
      wrapped
    );
  };

  return (
    <div
      ref={cardsRootRef}
      style={
        {
          "--cards-amount": cards.length,
          "--card-top-distance": topDistance,
          "--card-top-offset": topOffset,
          "--card-height": cardHeight,
          "--card-margin": cardMargin,
          "--card-padding": cardPadding,
          "--cards-gap": gap,
          "--rolling-count": rollingCount,
          marginBottom:
            "calc(-1 * (max(var(--discarded-amount, 0) - 1, 0)) * var(--card-top-offset) - var(--discarded-ratio, 0) * var(--card-top-offset))",
        } as CSSProperties
      }
    >
      <div className={styles.wrapper}>
        {cards.map((cardContent, cardIndex) => (
          <div
            key={cardIndex}
            data-card={""}
            data-animates={""}
            className={styles.card_root}
            style={
              {
                animationName: `${discardAnimationName}`,
                animationTimingFunction: "linear",
                animationFillMode: "forwards",
                "--index": `${cardIndex + 1}`,
                "--index0": "calc(var(--index) - 1)",
                "--reverse-index": "calc(var(--cards-amount) - var(--index0))",
                "--reverse-index0": "calc(var(--reverse-index) - 1)",
              } as CSSProperties
            }
          >
            <NestedStackContainer cardIndex={cardIndex} depth={rollingCount}>
              {cardContent}
            </NestedStackContainer>
          </div>
        ))}
      </div>
    </div>
  );
};
