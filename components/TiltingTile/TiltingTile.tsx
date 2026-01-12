import {
  ComponentProps,
  CSSProperties,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react";

import styles from "./TiltingTile.module.scss";

type TileLayer = { img: string | ReactNode; depth?: number };

type TiltingTilePropsWithLayers = {
  layers: TileLayer[];
};

type TiltingTilePropsWithSingleLayer = {
  layers: TileLayer;
};

export type TiltingTileProps =
  | ComponentProps<"span"> &
      (TiltingTilePropsWithLayers | TiltingTilePropsWithSingleLayer);

export const TiltingTile = ({ layers }: TiltingTileProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const layersArray = useMemo(
    () => (Array.isArray(layers) ? layers : [layers]),
    [layers]
  );
  const children = useMemo(
    () =>
      layersArray.map(({ img, depth = 0 }, index) => {
        const key = `layer-${index}`;
        const style: CSSProperties = {
          "--depth": depth,
          "--index": index,
        } as CSSProperties;
        return typeof img === "string" ? (
          <img
            key={key}
            className={styles.layer}
            src={img}
            alt=""
            style={style}
          />
        ) : (
          <span key={key} className={styles.layer} style={style}>
            {img}
          </span>
        );
      }),
    [layersArray]
  );
  useEffect(() => {
    const span = ref.current;
    if (span) {
      const handleGlobalPointerMove = (event: PointerEvent) => {
        const span = ref.current;
        if (span) {
          const maxAngle = 5;
          const { left, top, width, height } = span.getBoundingClientRect();
          const x = event.clientX - left;
          const y = event.clientY - top;
          const dX = Math.max(Math.min((x / width - 0.5) * 2, 1), -1);
          const dY = Math.max(Math.min((y / height - 0.5) * 2, 1), -1);
          const tiltX = Math.min(dX ** 2 * maxAngle, maxAngle) * Math.sign(dX);
          const tiltY = Math.min(dY ** 2 * maxAngle, maxAngle) * Math.sign(dY);
          span.style.setProperty(
            "--tilt-x",
            `${Math.round(tiltY * 100) / 100}deg`
          );
          span.style.setProperty(
            "--tilt-y",
            `${-Math.round(tiltX * 100) / 100}deg`
          );
          span.style.setProperty("--pointer-x", `${(x / width) * 100}%`);
          span.style.setProperty("--pointer-y", `${(y / height) * 100}%`);
          span.style.setProperty("--pointer-dx", `${dX}`);
          span.style.setProperty("--pointer-dy", `${dY}`);
        }
      };
      const handleTouchStart = () => {
        const span = ref.current;
        if (span) {
          span.dataset.touching = "true";
        }
      };
      const handleTouchEnd = () => {
        const span = ref.current;
        if (span) {
          span.dataset.touching = "false";
        }
      };
      span.addEventListener("pointerenter", handleTouchStart);
      span.addEventListener("touchstart", handleTouchStart);
      span.addEventListener("touchend", handleTouchEnd);
      span.addEventListener("touchcancel", handleTouchEnd);
      document.addEventListener("pointermove", handleGlobalPointerMove);
      return () => {
        document.removeEventListener("pointermove", handleGlobalPointerMove);
        span.removeEventListener("pointerenter", handleTouchStart);
        span.removeEventListener("touchstart", handleTouchStart);
        span.removeEventListener("touchend", handleTouchEnd);
        span.removeEventListener("touchcancel", handleTouchEnd);
      };
    }
  }, []);
  return (
    <span ref={ref} className={styles.tilting_tile_root}>
      <span className={styles.tilting_tile}>
        {children}
        <span
          className={styles.specular}
          style={{ "--index": layersArray.length } as CSSProperties}
        />
      </span>
    </span>
  );
};
