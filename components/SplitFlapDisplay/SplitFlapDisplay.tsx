import { CSSProperties, useEffect, useRef } from "react";

import styles from "./SplitFlapDisplay.module.scss";

export type SplitFlapDisplayProps = {
  value: string;
  length: number;
  characters: string;
};

export const SplitFlapDisplay = ({
  value,
  length,
  characters,
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
    <div className={styles.split_flap_display}>
      {displayValue.split("").map((char, i) => (
        <SplitFlapDisplayChar
          key={i}
          value={char}
          characters={finalCharacters}
        />
      ))}
    </div>
  );
};

const SplitFlapDisplayChar = ({
  value,
  characters,
}: {
  value: string;
  characters: string;
}) => {
  const lastValueRef = useRef<string>("");

  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  const currentCharacterIndex = characters.indexOf(value);

  return (
    <div
      className={styles.slot}
      style={
        {
          "--current-character-index": currentCharacterIndex,
          "--total": characters.length,
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
