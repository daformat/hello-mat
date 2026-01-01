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
    const unchangedCount = displayValue
      .split("")
      .reduce((unchanged, char, index) => {
        return lastValueRef.current?.[index] === char
          ? unchanged + 1
          : unchanged;
      }, 0);
    fullyFlippedRef.current = unchangedCount;

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
      if (fullyFlippedRef.current === length) {
        onFullyFlipped?.();
      }
    });

    useLayoutEffect(() => {
      lastValueRef.current = displayValue;
    }, [displayValue]);

    const handleFullyFlipped = useCallback(
      (_char: string, _index: number) => {
        fullyFlippedRef.current++;
        if (fullyFlippedRef.current === length) {
          onFullyFlipped?.();
        }
      },
      [length, onFullyFlipped]
    );

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
              index={i}
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

// const SAFARI_BUGGY_TURN_VALUES = [
//   11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 25, 26, 30, 34, 52, 57, 60,
//   65, 68, 73, 76, 81, 93, 109, 114, 125, 146, /*?*/ 187,
// ];

const SAFARI_BUGGY_TURN_VALUES = [11];

const SplitFlapDisplayChar = memo(
  ({
    value,
    index,
    characters,
    autoSkip,
    onFullyFlipped,
  }: {
    index: number;
    value: string;
    characters: string;
    autoSkip?: boolean;
    onFullyFlipped?: (char: string, index: number) => void;
  }) => {
    const lastValueRef = useRef<string>("");
    const turnRef = useRef<number>(0);
    const charRef = useRef<HTMLDivElement>(null);
    const isMountedRef = useRef(false);
    const flippingThroughTimeout = useRef<ReturnType<typeof setTimeout>>();
    const currentCharacterIndex = characters.indexOf(value);

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
          onFullyFlipped?.(value, index);
        });
      }
    });

    useLayoutEffect(() => {
      const newCharIndex = characters.indexOf(value);
      const lastCharIndex = characters.indexOf(lastValueRef.current);
      const isGoingBackwards = newCharIndex < lastCharIndex;
      const isGoingForwards = newCharIndex > lastCharIndex;

      if (!isMountedRef.current) {
        charRef.current?.style.setProperty("--flip-duration", "0ms");
        charRef.current?.style.setProperty(
          "--current-character-index",
          `${newCharIndex}`
        );
        lastValueRef.current = value;
        requestAnimationFrame(() => {
          charRef.current?.style.removeProperty("--flip-duration");
          onFullyFlipped?.(value, index);
        });
        return;
      }

      let updatedTurn = false;
      const updateTurn = (
        prevIndex = lastCharIndex,
        nextIndex = newCharIndex,
        duration?: number
      ) => {
        if (!updatedTurn) {
          turnRef.current++;
          if (turnRef.current === 3) {
            turnRef.current = 1;
          }
          charRef.current?.style.setProperty(
            "--current-character-index",
            `${prevIndex}`
          );
          charRef.current?.style.setProperty("--flip-duration", "0ms");
          charRef.current?.style.setProperty(
            "--turn",
            `${turnRef.current - 1}`
          );
          requestAnimationFrame(() => {
            if (duration) {
              charRef.current?.style.setProperty(
                "--flip-duration",
                `${duration}ms`
              );
            } else {
              charRef.current?.style.removeProperty("--flip-duration");
            }
            charRef.current?.style.setProperty("--turn", `${turnRef.current}`);
            charRef.current?.style.setProperty(
              "--current-character-index",
              `${nextIndex}`
            );
          });
          // const lastKnownSafariBuggyTurn =
          //   SAFARI_BUGGY_TURN_VALUES[SAFARI_BUGGY_TURN_VALUES.length - 1];
          // if (SAFARI_BUGGY_TURN_VALUES.includes(turnRef.current)) {
          //   while (SAFARI_BUGGY_TURN_VALUES.includes(turnRef.current)) {
          //     console.log("skipping turn", turnRef.current);
          //     turnRef.current++;
          //   }
          //   if (turnRef.current - 1 === lastKnownSafariBuggyTurn) {
          //     turnRef.current = 1;
          //   }
          //   charRef.current?.style.setProperty(
          //     "--current-character-index",
          //     `${lastCharIndex}`
          //   );
          //   charRef.current?.style.setProperty("--flip-duration", "0ms");
          //   charRef.current?.style.setProperty(
          //     "--turn",
          //     `${turnRef.current - 1}`
          //   );
          //   requestAnimationFrame(() => {
          //     charRef.current?.style.removeProperty("--flip-duration");
          //     charRef.current?.style.setProperty(
          //       "--turn",
          //       `${turnRef.current}`
          //     );
          //     charRef.current?.style.setProperty(
          //       "--current-character-index",
          //       `${newCharIndex}`
          //     );
          //   });
          // } else {
          //   charRef.current?.style.setProperty("--turn", `${turnRef.current}`);
          // }
          updatedTurn = true;
        }
      };

      if (autoSkip && newCharIndex < lastCharIndex) {
        const remainingChars = characters.slice(lastCharIndex + 1, undefined);
        const precedingChars = characters.slice(0, newCharIndex);
        const charsToDisplay = characters
          .split("")
          .filter(
            (char) =>
              !remainingChars.includes(char) && !precedingChars.includes(char)
          );
        const charsToDisplayCount = charsToDisplay.length;
        const shouldSkip =
          (remainingChars.length || precedingChars.length) &&
          charsToDisplayCount >= 4;
        if (shouldSkip) {
          charRef.current?.style.setProperty(
            "--current-character-index",
            `${lastCharIndex}`
          );
          charRef.current?.style.setProperty("--flip-duration", "0ms");
          charRef.current?.style.setProperty(
            "--total",
            `${charsToDisplayCount}`
          );
          [...remainingChars, ...precedingChars].forEach((char) => {
            const span = charRef.current?.querySelector(
              `[data-char="${char}"]`
            );
            if (span instanceof HTMLElement) {
              span.style.setProperty("--index", "-1");
              span.style.setProperty("display", "none");
            }
          });
          charsToDisplay.forEach((char, index) => {
            const span = charRef.current?.querySelector(
              `[data-char="${char}"]`
            );
            if (span instanceof HTMLElement) {
              span.style.setProperty("--index", `${index}`);
            }
          });
          charRef.current?.style.setProperty(
            "--current-character-index",
            `${charsToDisplay.indexOf(lastValueRef.current)}`
          );
          requestAnimationFrame(() => {
            charRef.current?.style.removeProperty("--flip-duration");
            charRef.current?.style.setProperty(
              "--current-character-index",
              `${charsToDisplay.indexOf(value)}`
            );
            charRef.current?.addEventListener(
              "transitionend",
              () => {
                charRef.current?.style.setProperty("--flip-duration", "0ms");
                charRef.current?.style.setProperty(
                  "--total",
                  `${characters.length}`
                );
                [...characters].forEach((char) => {
                  const span = charRef.current?.querySelector(
                    `[data-char="${char}"]`
                  );
                  if (span instanceof HTMLElement) {
                    span.style.setProperty(
                      "--index",
                      `${characters.indexOf(char)}`
                    );
                    span.style.removeProperty("display");
                  }
                });
                charRef.current?.style.setProperty(
                  "--current-character-index",
                  `${charsToDisplay.indexOf(lastValueRef.current)}`
                );
                requestAnimationFrame(() => {
                  charRef.current?.style.removeProperty("--flip-duration");
                });
              },
              { once: true }
            );
            updateTurn();
          });
        } else {
          updateTurn();
        }
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
        let transitoryIndex = lastCharIndex;

        const update = () => {
          const remainingChar = remainingChars.pop();
          const precedingChar = remainingChar
            ? undefined
            : precedingChars.pop();
          const transitoryChar = remainingChar ?? precedingChar;
          if (transitoryChar) {
            transitoryIndex = characters.indexOf(transitoryChar);
            charRef.current?.style.setProperty(
              "--flip-duration",
              intervalTime + "ms"
            );
            charRef.current?.style.setProperty(
              "--current-character-index",
              `${transitoryIndex}`
            );
            if (precedingChar) {
              updateTurn(
                (transitoryIndex + characters.length - 1) % characters.length,
                transitoryIndex,
                intervalTime
              );
            }
            flippingThroughTimeout.current = setTimeout(update, intervalTime);
          } else {
            charRef.current?.style.setProperty(
              "--current-character-index",
              `${characters.indexOf(value)}`
            );
            if (isGoingBackwards) {
              updateTurn(transitoryIndex, newCharIndex, intervalTime);
            }
            const checkAnimations = () => {
              const animations = charRef.current?.getAnimations({
                subtree: true,
              });
              if (animations?.length) {
                Promise.allSettled(animations.map((a) => a.finished)).then(
                  () => {
                    charRef.current?.style.removeProperty("--flip-duration");
                    onFullyFlipped?.(value, index);
                  }
                );
              } else {
                charRef.current?.style.removeProperty("--flip-duration");
                onFullyFlipped?.(value, index);
              }
              charRef.current?.removeEventListener(
                "transitionend",
                checkAnimations
              );
            };

            checkAnimations();
          }
        };
        update();
        // updateTurn();
      }
      lastValueRef.current = value;
    }, [autoSkip, characters, index, onFullyFlipped, value]);

    return (
      <div
        ref={charRef}
        className={styles.slot}
        style={
          {
            "--current-character-index": currentCharacterIndex,
            "--total": characters.length,
            "--turn": turnRef.current,
          } as CSSProperties
        }
      >
        {characters.split("").map((char, i) => (
          <div
            key={i}
            data-char={char}
            data-index={index}
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
