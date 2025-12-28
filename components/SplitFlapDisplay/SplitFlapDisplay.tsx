import { CSSProperties, useLayoutEffect, useRef } from "react";

import styles from "./SplitFlapDisplay.module.scss";

export type SplitFlapDisplayProps = {
  value: string;
  length: number;
  characters: string;
  style?: CSSProperties;
};

export const SplitFlapDisplay = ({
  value,
  length,
  characters,
  style,
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
  const turnRef = useRef<number>(0);
  const charRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (characters.indexOf(value) < characters.indexOf(lastValueRef.current)) {
      turnRef.current++;
      charRef.current?.style.setProperty("--turn", `${turnRef.current}`);
    }
    lastValueRef.current = value;
  }, [characters, value]);

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
