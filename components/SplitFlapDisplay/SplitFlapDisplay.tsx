import { CSSProperties, useLayoutEffect, useRef } from "react";

import styles from "./SplitFlapDisplay.module.scss";

export type SplitFlapDisplayProps = {
  value: string;
  length: number;
  characters: string;
  style?: CSSProperties;
  autoSkip?: boolean;
};

export const SplitFlapDisplay = ({
  value,
  length,
  characters,
  style,
  autoSkip,
}: SplitFlapDisplayProps) => {
  const isOverflowing = value.length > length;
  const displayValue = (
    isOverflowing ? value.slice(0, length - 1) + "…" : value
  ).padEnd(length, " ");
  const finalCharacters =
    (characters.includes(" ") ? "" : " ") +
    characters +
    (isOverflowing ? "…" : "");

  return (
    <div className={styles.split_flap_display} style={style}>
      {displayValue.split("").map((char, i) => (
        <SplitFlapDisplayChar
          key={i}
          value={char}
          characters={finalCharacters}
          autoSkip={autoSkip}
        />
      ))}
    </div>
  );
};

const SplitFlapDisplayChar = ({
  value,
  characters,
  autoSkip,
}: {
  value: string;
  characters: string;
  autoSkip?: boolean;
}) => {
  const lastValueRef = useRef<string>("");
  const turnRef = useRef<number>(0);
  const charRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const newCharIndex = characters.indexOf(value);
    const lastCharIndex = characters.indexOf(lastValueRef.current);

    if (newCharIndex < lastCharIndex) {
      const animationTiming = charRef.current
        ? parseFloat(
            getComputedStyle(charRef.current).getPropertyValue(
              "--flip-duration"
            )
          )
        : 0;
      const remainingChars = characters
        .slice(lastCharIndex + 1)
        .split("")
        .reverse();
      const precedingChars = characters
        .slice(0, newCharIndex)
        .split("")
        .reverse();
      const totalChars = remainingChars.length + precedingChars.length + 1;
      const intervalTime = animationTiming / totalChars;
      console.log({ remainingChars, precedingChars, animationTiming });
      let updatedTurn = false;
      const updateTurn = () => {
        if (!updatedTurn) {
          console.log("updateTurn");
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
          console.log(newChar, characters.indexOf(newChar));
          charRef.current?.style.setProperty(
            "--current-character-index",
            `${characters.indexOf(newChar)}`
          );
          if (precedingChar) {
            updateTurn();
          }
          setTimeout(update, intervalTime);
        } else {
          console.log(value, characters.indexOf(value));
          charRef.current?.style.setProperty(
            "--current-character-index",
            `${characters.indexOf(value)}`
          );
          charRef.current?.addEventListener("transitionend", () => {
            charRef.current?.style.removeProperty("--flip-duration");
          });
          updateTurn();
        }
      };
      update();
      // updateTurn();
    }
    lastValueRef.current = value;
  }, [autoSkip, characters, value]);

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
