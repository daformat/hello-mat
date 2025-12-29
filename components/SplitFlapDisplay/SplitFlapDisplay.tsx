import {
  CSSProperties,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import styles from "./SplitFlapDisplay.module.scss";

export type SplitFlapDisplayProps = {
  value: string;
  length: number;
  characters: string | string[];
  style?: CSSProperties;
  autoSkip?: boolean;
  onFullyFlipped?: () => void;
};

export const SplitFlapDisplay = memo(
  ({
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
    const fullyFlippedRef = useRef(0);
    const lastValueRef = useRef("");

    const validateCharacters = () => {
      const chars = characters instanceof Array ? characters : [characters];
      const isInvalid = chars.some((chars) => !chars.length);
      if (isInvalid) {
        throw new Error(
          "SplitFlapDisplay: characters must be a non empty string, or an array of non empty strings"
        );
      }
    };
    validateCharacters();

    useLayoutEffect(() => {
      const unchangedCount = displayValue
        .split("")
        .reduce((unchanged, char, index) => {
          return lastValueRef.current?.[index] === char
            ? unchanged + 1
            : unchanged;
        }, 0);
      fullyFlippedRef.current = unchangedCount;
      lastValueRef.current = displayValue;
    }, [displayValue]);

    const handleFullyFlipped = useCallback(() => {
      fullyFlippedRef.current++;
      if (fullyFlippedRef.current === length) {
        onFullyFlipped?.();
      }
    }, [length, onFullyFlipped]);

    return (
      <div className={styles.split_flap_display} style={style}>
        {displayValue.split("").map((char, i) => {
          const chars =
            characters instanceof Array ? characters[i] : characters;
          const finalCharacters =
            chars + (isOverflowing && i === length - 1 ? "…" : "");
          return (
            <SplitFlapDisplayChar
              key={i}
              value={char}
              characters={finalCharacters}
              autoSkip={autoSkip}
              onFullyFlipped={handleFullyFlipped}
            />
          );
        })}
      </div>
    );
  }
);

SplitFlapDisplay.displayName = "SplitFlapDisplay";

const SplitFlapDisplayChar = memo(
  ({
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

    if (characters.indexOf(value) === -1) {
      throw new Error(
        `Character "${value}" is not in character set "${characters}"`
      );
    }

    useEffect(() => {
      isMountedRef.current = true;
    }, []);

    useLayoutEffect(() => {
      if (value === lastValueRef.current) {
        setTimeout(() => {
          onFullyFlipped?.();
        });
      }
    });

    useLayoutEffect(() => {
      const newCharIndex = characters.indexOf(value);
      const lastCharIndex = characters.indexOf(lastValueRef.current);
      const isGoingBackwards = newCharIndex < lastCharIndex;
      const isGoingForwards = newCharIndex > lastCharIndex;

      if (!isMountedRef.current) {
        lastValueRef.current = value;
        setTimeout(() => {
          onFullyFlipped?.();
        }, 100);
        return;
      }

      let updatedTurn = false;
      const updateTurn = () => {
        if (!updatedTurn) {
          turnRef.current++;
          charRef.current?.style.setProperty("--turn", `${turnRef.current}`);
          updatedTurn = true;
        }
      };

      if (autoSkip && newCharIndex < lastCharIndex) {
        updateTurn();
      } else if (isGoingBackwards || isGoingForwards) {
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
        const intervalTime = Math.max(animationTiming / totalChars, 120);

        const update = () => {
          const remainingChar = remainingChars.pop();
          const precedingChar = remainingChar
            ? undefined
            : precedingChars.pop();
          const newChar = remainingChar ?? precedingChar;
          if (newChar) {
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
              if (animations?.length) {
                Promise.allSettled(animations.map((a) => a.finished)).then(
                  () => {
                    charRef.current?.style.removeProperty("--flip-duration");
                    onFullyFlipped?.();
                  }
                );
              } else {
                charRef.current?.style.removeProperty("--flip-duration");
                onFullyFlipped?.();
              }
              charRef.current?.removeEventListener(
                "transitionend",
                checkAnimations
              );
            };

            checkAnimations();
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
  }
);

SplitFlapDisplayChar.displayName = "SplitFlapDisplayChar";
