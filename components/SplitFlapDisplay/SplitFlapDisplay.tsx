import { CSSProperties, useEffect, useLayoutEffect, useRef } from "react";

import styles from "./SplitFlapDisplay.module.scss";

export type SplitFlapDisplayProps = {
  value: string;
  length: number;
  characters: string;
  style?: CSSProperties;
  autoSkip?: boolean;
  onFullyFlipped?: () => void;
};

export const SplitFlapDisplay = ({
  value,
  length,
  characters,
  style,
  autoSkip,
  onFullyFlipped,
}: SplitFlapDisplayProps) => {
  const isOverflowing = value.length > length;
  const displayValue = (
    isOverflowing ? value.slice(0, length - 1) + "…" : value
  ).padEnd(length, " ");
  const finalCharacters =
    (characters.includes(" ") ? "" : " ") +
    characters +
    (isOverflowing ? "…" : "");
  const fullyFlippedRef = useRef(0);

  useLayoutEffect(() => {
    fullyFlippedRef.current = 0;
  }, [value]);

  return (
    <div className={styles.split_flap_display} style={style}>
      {displayValue.split("").map((char, i) => (
        <SplitFlapDisplayChar
          key={i}
          value={char}
          characters={finalCharacters}
          autoSkip={autoSkip}
          onFullyFlipped={() => {
            fullyFlippedRef.current++;
            if (fullyFlippedRef.current === length) {
              onFullyFlipped?.();
            }
          }}
        />
      ))}
    </div>
  );
};

const SplitFlapDisplayChar = ({
  value,
  characters,
  autoSkip,
  onFullyFlipped,
}: {
  value: string;
  characters: string;
  autoSkip?: boolean;
  onFullyFlipped?: () => void;
}) => {
  const lastValueRef = useRef<string>("");
  const turnRef = useRef<number>(0);
  const charRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);
  const flippingThroughTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  useLayoutEffect(() => {
    const newCharIndex = characters.indexOf(value);
    const lastCharIndex = characters.indexOf(lastValueRef.current);
    const isGoingBackwards = newCharIndex < lastCharIndex;
    const isGoingForwards = newCharIndex > lastCharIndex + 1;

    if (!isMountedRef.current) {
      lastValueRef.current = value;
      onFullyFlipped?.();
      return;
    }

    if (isGoingBackwards || isGoingForwards) {
      if (flippingThroughTimeout.current) {
        clearTimeout(flippingThroughTimeout.current);
      }
      const animationTiming = charRef.current
        ? parseFloat(
            getComputedStyle(charRef.current).getPropertyValue(
              "--flip-duration"
            )
          )
        : 0;
      const remainingChars = characters
        .slice(lastCharIndex + 1, isGoingForwards ? newCharIndex : undefined)
        .split("")
        .reverse();
      const precedingChars = characters
        .slice(isGoingForwards ? newCharIndex : 0, newCharIndex)
        .split("")
        .reverse();
      const totalChars = remainingChars.length + precedingChars.length + 1;
      const intervalTime = animationTiming / totalChars;
      let updatedTurn = false;
      const updateTurn = () => {
        if (!updatedTurn) {
          turnRef.current++;
          charRef.current?.style.setProperty("--turn", `${turnRef.current}`);
          updatedTurn = true;
        }
      };
      const update = () => {
        const remainingChar = remainingChars.pop();
        const precedingChar = remainingChar ? undefined : precedingChars.pop();
        const newChar = remainingChar ?? precedingChar;
        if (newChar && !autoSkip) {
          charRef.current?.style.setProperty(
            "--flip-duration",
            intervalTime + "ms"
          );
          charRef.current?.style.setProperty(
            "--current-character-index",
            `${characters.indexOf(newChar)}`
          );
          if (precedingChar) {
            updateTurn();
          }
          flippingThroughTimeout.current = setTimeout(update, intervalTime);
        } else {
          charRef.current?.style.setProperty(
            "--current-character-index",
            `${characters.indexOf(value)}`
          );
          const checkAnimations = () => {
            const animations = charRef.current?.getAnimations({
              subtree: true,
            });
            console.log(animations);
            if (animations) {
              Promise.all(animations.map((a) => a.finished)).then(() => {
                charRef.current?.style.removeProperty("--flip-duration");
                onFullyFlipped?.();
                charRef.current?.removeEventListener(
                  "transitionend",
                  checkAnimations
                );
              });
            }
          };
          charRef.current?.addEventListener("transitionend", checkAnimations);
          if (isGoingBackwards) {
            updateTurn();
          }
        }
      };
      update();
      // updateTurn();
    }
    lastValueRef.current = value;
  }, [autoSkip, characters, onFullyFlipped, value]);

  const currentCharacterIndex = characters.indexOf(value);

  return (
    <div
      ref={charRef}
      className={styles.slot}
      style={
        {
          "--current-character-index": currentCharacterIndex,
          "--current-character-index-with-turns":
            currentCharacterIndex + turnRef.current * (characters.length - 1),
          "--total": characters.length,
          "--turn": turnRef.current,
        } as CSSProperties
      }
    >
      {characters.split("").map((char, i) => (
        <div
          key={i}
          className={styles.character}
          style={
            {
              "--index": i,
            } as CSSProperties
          }
        >
          <div className={styles.flap}>
            <div>{char}</div>
          </div>
          <div className={styles.flap} aria-hidden={true}>
            <div>{char}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
