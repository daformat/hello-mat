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
    <span className={styles.slot}>
      {characters.split("").map((char, i) => (
        <span
          key={i}
          className={styles.character}
          style={
            {
              "--index": i,
              "--current-character-index": currentCharacterIndex,
              "--total": characters.length,
            } as CSSProperties
          }
        >
          <span className={styles.flap}>
            <span>{char}</span>
          </span>
          <span className={styles.flap} aria-hidden={true}>
            <span>{char}</span>
          </span>
        </span>
      ))}
    </span>
  );
};
