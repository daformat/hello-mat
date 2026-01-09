import {
  ComponentProps,
  ComponentPropsWithoutRef,
  createContext,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { MaybeNull } from "@/components/Media/utils/maybe";

export type SliderValue = { id: string | number; value: number; label: string };

const SliderContext = createContext<{
  values: SliderValue[];
  onChange: (values: SliderValue[]) => void;
  getValue: (id: string | number) => SliderValue;
  min: number;
  max: number;
  step?: number;
  trackRef: RefObject<MaybeNull<HTMLSpanElement>>;
  setTrackRef: (ref: RefObject<MaybeNull<HTMLSpanElement>>) => void;
  rootRef: RefObject<MaybeNull<HTMLSpanElement>>;
  markerValues: number[];
  registerMarker: (value: number) => void;
  unregisterMarker: (value: number) => void;
  magnetizeMarkers?: boolean;
  magnetizeThreshold?: number;
}>({
  values: [],
  onChange: () => {},
  getValue: () => ({ id: -1, value: 0, label: "" }),
  min: 0,
  max: 0,
  step: undefined,
  trackRef: { current: null },
  setTrackRef: () => {},
  rootRef: { current: null },
  markerValues: [],
  registerMarker: () => {},
  unregisterMarker: () => {},
  magnetizeMarkers: undefined,
  magnetizeThreshold: undefined,
});

const useSliderContext = () => {
  return useContext(SliderContext);
};

const getDecimalCount = (value: number) => {
  return (String(value).split(".")[1] || "").length;
};

const roundValue = (value: number, decimalCount: number) => {
  const rounder = Math.pow(10, decimalCount);
  return Math.round(value * rounder) / rounder;
};

/**
 * Snap to nearest marker if pointer is within pixel threshold
 * @returns The marker value if within threshold, otherwise the raw value
 */
const magnetizeToMarker = (
  clientX: number,
  rawValue: number,
  markerValues: number[],
  thresholdPx: number,
  trackRect: DOMRect,
  min: number,
  max: number
): number => {
  if (markerValues.length === 0) {
    return rawValue;
  }

  const totalRange = max - min;
  let nearestMarker: number | undefined;
  let nearestDistancePx = Infinity;

  for (const marker of markerValues) {
    const markerPercentage = (marker - min) / totalRange;
    const markerClientX = trackRect.left + markerPercentage * trackRect.width;
    const distancePx = Math.abs(clientX - markerClientX);

    if (distancePx < nearestDistancePx) {
      nearestDistancePx = distancePx;
      nearestMarker = marker;
    }
  }

  if (nearestMarker !== undefined && nearestDistancePx <= thresholdPx) {
    return nearestMarker;
  }

  return rawValue;
};

type SliderControlledProps = {
  values: SliderValue[];
  defaultValues?: never;
};

type SliderUncontrolledProps = {
  values?: never;
  defaultValues: SliderValue[];
};

type SliderBaseProps = {
  min: number;
  max: number;
  step?: number;
  magnetizeMarkers?: boolean;
  magnetizeThreshold?: number;
  onChange?: (values: SliderValue[]) => void;
} & (SliderControlledProps | SliderUncontrolledProps);

export type SliderProps = SliderBaseProps &
  Omit<ComponentProps<"span">, "onChange">;

const SliderRoot = ({
  min,
  max,
  step,
  values,
  defaultValues,
  onChange,
  magnetizeMarkers,
  magnetizeThreshold = 8,
  children,
  ...props
}: SliderProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [markerValues, setMarkerValues] = useState<number[]>([]);
  const [internalValues, setInternalValues] = useState<SliderValue[]>(
    defaultValues ?? []
  );
  const [trackRef, setTrackRef] = useState<
    RefObject<MaybeNull<HTMLSpanElement>>
  >({ current: null });
  const currentValues = useMemo(
    () => values ?? internalValues ?? [],
    [internalValues, values]
  );
  const handleChange = useCallback(
    (newValues: SliderValue[]) => {
      setInternalValues(newValues);
      onChange?.(newValues);
    },
    [onChange]
  );

  const registerMarker = useCallback((value: number) => {
    setMarkerValues((prev) => {
      if (prev.includes(value)) {
        return prev;
      }
      return [...prev, value].sort((a, b) => a - b);
    });
  }, []);

  const unregisterMarker = useCallback((value: number) => {
    setMarkerValues((prev) => prev.filter((v) => v !== value));
  }, []);

  // Round values to step if needed
  useLayoutEffect(() => {
    if (step) {
      let update = false;
      const values = currentValues.map(({ value, ...rest }) => {
        const steppedValue = roundValue(
          Math.round((value - min) / step) * step + min,
          getDecimalCount(step)
        );
        if (steppedValue !== value) {
          update = true;
        }
        return {
          ...rest,
          value: steppedValue,
        };
      });
      if (update) {
        handleChange(values);
      }
    }
  }, [currentValues, handleChange, min, step]);

  // Check for valid values length
  if (
    currentValues.length === 0 ||
    (currentValues.length !== 1 && currentValues.length % 2 !== 0)
  ) {
    throw new Error(
      `Slider must have exactly one value, or an even number of values for multi range inputs. Got ${currentValues.length} values.`
    );
  }

  // Check for valid min / max
  if (min > max) {
    throw new Error(
      `Slider min must be less than max. Got min: ${min}, max: ${max}`
    );
  }

  // Check for unique IDs
  const ids = new Set(currentValues.map(({ id }) => id));
  if (ids.size !== currentValues.length) {
    const uniqueIds = new Set();
    const duplicatedIds = new Set();
    currentValues.forEach(({ id }) => {
      if (!uniqueIds.has(id)) {
        uniqueIds.add(id);
      } else {
        duplicatedIds.add(id);
      }
    });
    throw new Error(
      `Slider values must have unique IDs. Got duplicate IDs: ${[
        ...duplicatedIds,
      ].join(", ")}`
    );
  }

  return (
    <SliderContext.Provider
      value={{
        min,
        max,
        step,
        values: currentValues,
        onChange: handleChange,
        getValue: (valueId) => {
          const value = currentValues.find(({ id }) => id === valueId);
          if (!value) {
            throw new Error(`Couldn't find value with id "${valueId}"`);
          }
          return value;
        },
        trackRef: trackRef,
        setTrackRef: setTrackRef,
        rootRef: ref,
        markerValues,
        registerMarker,
        unregisterMarker,
        magnetizeMarkers,
        magnetizeThreshold,
      }}
    >
      <span ref={ref} {...props}>
        {children}
      </span>
    </SliderContext.Provider>
  );
};

const SliderTrack = ({
  children,
  onClick,
  ...props
}: ComponentProps<"span">) => {
  const {
    setTrackRef,
    step,
    max,
    min,
    onChange,
    values,
    markerValues,
    magnetizeMarkers,
    magnetizeThreshold,
  } = useSliderContext();
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    setTrackRef(ref);
  }, [setTrackRef]);

  const handleOnClick = useCallback<MouseEventHandler<HTMLSpanElement>>(
    (event) => {
      onClick?.(event);
      const track = ref.current;
      if (!event.defaultPrevented && track && values.length === 1) {
        const [firstValue] = values;
        const { clientX } = event;
        const rect = track.getBoundingClientRect();
        const trackWidth = rect.width;
        if (
          firstValue &&
          clientX >= rect.left &&
          clientX <= rect.left + rect.width
        ) {
          const percentage = (clientX - rect.left) / trackWidth;
          const rawNewValue = percentage * (max - min) + min;
          let newValue = step
            ? roundValue(
                Math.round((rawNewValue - min) / step) * step + min,
                getDecimalCount(step)
              )
            : rawNewValue;

          // Apply magnetization if enabled and no step
          if (!step && magnetizeMarkers && magnetizeThreshold !== undefined) {
            newValue = magnetizeToMarker(
              clientX,
              newValue,
              markerValues,
              magnetizeThreshold,
              rect,
              min,
              max
            );
          }

          onChange([
            { id: firstValue.id, value: newValue, label: `${newValue}` },
          ]);
        }
      }
    },
    [
      max,
      min,
      onChange,
      onClick,
      step,
      values,
      markerValues,
      magnetizeMarkers,
      magnetizeThreshold,
    ]
  );

  return (
    <span ref={ref} data-track={""} onClick={handleOnClick} {...props}>
      {children}
    </span>
  );
};

const SliderRange = ({ style, ...props }: ComponentProps<"span">) => {
  const context = useSliderContext();
  const minValue = context.values.reduce(
    (min, value) => (min && min.value <= value.value ? min : value),
    context.values[0]
  );
  const maxValue = context.values.reduce(
    (max, value) => (max && max.value >= value.value ? max : value),
    context.values[0]
  );
  const totalSlider = context.max - context.min;
  const minValuePercentage =
    context.values.length > 1
      ? ((minValue?.value ?? 0) - context.min) / totalSlider
      : 0;
  const maxValuePercentage =
    (context.max - (maxValue?.value ?? 0)) / totalSlider;

  const totalRange = (maxValue?.value ?? 0) - (minValue?.value ?? 0);
  const sortedValues = [...context.values].sort((a, b) => a.value - b.value);
  const stops = sortedValues.map(({ value, id }) => {
    return {
      id,
      stop: (value - (minValue?.value ?? 0)) / totalRange,
      offset: value / totalSlider,
    };
  });

  return (
    <span
      data-range={""}
      style={{
        ...style,
        position: "absolute",
        left: context.values.length > 1 ? `${minValuePercentage * 100}%` : 0,
        right:
          context.values.length > 1
            ? `${maxValuePercentage * 100}%`
            : `calc(${maxValuePercentage * 100}% + (var(--thumb-${
                maxValue?.id
              }-width, 0px) * ${Math.max(maxValuePercentage - 0.5, 0) * -1}))`,
        maskImage: `linear-gradient(to right, ${stops
          .map(({ stop, offset, id }, index) => {
            const thumbOffset = offset - 0.5;
            const stopOffset = `calc(${
              stop * 100
            }% + var(--thumb-${id}-width, 0px) * ${-thumbOffset})`;
            return `${
              index % 2 === 0 ? "transparent" : "black"
            } ${stopOffset}, ${
              index % 2 === 0 ? "black" : "transparent"
            } ${stopOffset}`;
          })
          .join(", ")})`,
      }}
      {...props}
    />
  );
};

export type SliderThumbProps = { valueId: string | number };

const SliderThumb = ({
  valueId,
  style,
  ...props
}: ComponentPropsWithoutRef<"span"> & SliderThumbProps) => {
  const context = useSliderContext();
  const value = context.values.find(({ id }) => id === valueId);
  const totalSlider = context.max - context.min;
  const positionPercentage = (value?.value ?? 0) / totalSlider;
  const ref = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const dragRef = useRef<{
    startX: number;
    lastValidX: number;
    isDragging: boolean;
    lastTime: number;
    velocityX: number;
  }>({
    startX: 0,
    lastValidX: 0,
    isDragging: false,
    lastTime: 0,
    velocityX: 0,
  });

  const updateVelocity = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const friction = 0.4;
    const decelerationFactor = 1 - friction;
    dragRef.current.velocityX *= decelerationFactor;
    if (Math.abs(dragRef.current.velocityX) <= 0.01) {
      dragRef.current.velocityX = 0;
    }
    context.rootRef.current?.style.setProperty(
      `--velocity-${valueId}`,
      `${dragRef.current.velocityX}`
    );
    if (Math.abs(dragRef.current.velocityX) > 0) {
      rafRef.current = requestAnimationFrame(updateVelocity);
    }
  }, [context.rootRef, valueId]);

  const handlePointerDown = useCallback<PointerEventHandler>((event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current.isDragging = true;
    dragRef.current.startX = event.clientX;
    dragRef.current.lastValidX = event.clientX;
    dragRef.current.lastTime = Date.now();
  }, []);

  const handlePointerMove = useEffectEvent((event: PointerEvent) => {
    event.preventDefault();
    const maxAbsoluteVelocity = 15;
    if (dragRef.current.isDragging) {
      const thumb = ref.current;
      const track = context.trackRef.current;
      if (track && thumb) {
        const totalSlider = context.max - context.min;
        const rect = track.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        const trackWidth = rect.width;
        const clampedClientX = Math.min(
          Math.max(event.clientX, rect.left - thumbRect.width / 2),
          rect.left + rect.width + thumbRect.width / 2
        );
        const delta = clampedClientX - dragRef.current.lastValidX;
        const value = context.values.find(({ id }) => id === valueId);
        const rawNewValue = Math.min(
          Math.max(
            (value?.value ?? 0) + (delta / trackWidth) * totalSlider,
            context.min
          ),
          context.max
        );
        // Out of bounds?
        if (
          (delta < 0 && event.clientX > thumbRect.left + thumbRect.width / 2) ||
          (delta > 0 && event.clientX < thumbRect.left + thumbRect.width / 2)
        ) {
          dragRef.current.lastValidX = event.clientX;
          dragRef.current.lastTime = Date.now();
          return;
        }

        let newValue = context.step
          ? roundValue(
              Math.round((rawNewValue - context.min) / context.step) *
                context.step +
                context.min,
              getDecimalCount(context.step)
            )
          : rawNewValue;

        if (
          context.magnetizeMarkers &&
          context.magnetizeThreshold !== undefined
        ) {
          newValue = magnetizeToMarker(
            event.clientX,
            newValue,
            context.markerValues,
            context.magnetizeThreshold,
            rect,
            context.min,
            context.max
          );
        }

        const didChangeValue = newValue !== value?.value;
        context.onChange([
          ...context.values.filter(({ id }) => id !== valueId),
          { id: valueId, value: newValue, label: `${newValue}` },
        ]);
        if (didChangeValue) {
          const currentTime = Date.now();
          const deltaTime = currentTime - dragRef.current.lastTime;
          const valueX =
            rect.left + (rect.width * (newValue - context.min)) / totalSlider;
          const deltaX = valueX - dragRef.current.lastValidX;
          if (deltaTime > 0 && didChangeValue) {
            dragRef.current.velocityX = (deltaX / deltaTime) * 10; // (pixels per millisecond)
            if (Math.abs(dragRef.current.velocityX) > maxAbsoluteVelocity) {
              dragRef.current.velocityX =
                Math.sign(dragRef.current.velocityX) * maxAbsoluteVelocity;
            }
          }
          dragRef.current.lastTime = currentTime;
          dragRef.current.lastValidX = clampedClientX;
          updateVelocity();
        }
      }
    }
  });

  const handlePointerUp = useCallback(() => {
    dragRef.current.isDragging = false;
  }, []);

  useEffect(() => {
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const offsetThumb = useCallback(() => {
    const span = ref.current;
    const root = context.rootRef.current;
    if (root && span) {
      const rect = span.getBoundingClientRect();
      const spanWidth = rect.width;
      const offset = positionPercentage - 0.5;
      span.style.left = `calc(${positionPercentage * 100}% + ${
        spanWidth * -offset
      }px)`;
      root.style.setProperty(`--thumb-${valueId}-width`, `${spanWidth}px`);
      root.style.setProperty("--thumb-width", `${spanWidth}px`);
      // const range = root.querySelector<HTMLElement>("[data-range]");
      // if (range) {
      //   let radius = getComputedStyle(span).borderRadius;
      //   if (radius.includes("%")) {
      //     radius = (parseFloat(radius) / 100) * rect.height + "px";
      //   }
      //   range.style.borderBottomRightRadius = radius;
      //   range.style.borderTopRightRadius = radius;
      // }
    }
  }, [context.rootRef, positionPercentage, valueId]);

  useLayoutEffect(() => {
    offsetThumb();
  }, [offsetThumb]);

  useLayoutEffect(() => {
    const span = ref.current;
    if (span) {
      const observer = new ResizeObserver(offsetThumb);
      observer.observe(span);
      return () => observer.disconnect();
    }
  }, [offsetThumb]);

  return (
    <span
      ref={ref}
      data-thumb={""}
      data-value-id={valueId}
      onPointerDown={handlePointerDown}
      style={{
        touchAction: "none",
        left: `${positionPercentage * 100}%`,
        ...style,
      }}
      {...props}
    />
  );
};

export type SliderValueProps = {
  valueId: string | number;
  formatValue?: (value: number) => ReactNode;
} & ComponentProps<"span">;

const SliderValue = ({
  valueId,
  formatValue,
  children,
  ...props
}: SliderValueProps) => {
  const context = useSliderContext();
  const value = context.values.find(({ id }) => id === valueId);
  // const totalRange = context.max - context.min;
  // const positionPercentage = (value?.value ?? 0) / totalRange;
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const span = ref.current;
    const thumb = context.rootRef.current?.querySelector<HTMLSpanElement>(
      `[data-thumb][data-value-id="${valueId}"]`
    );
    if (span && thumb) {
      const thumbLeft = thumb.style.left;
      span.style.setProperty("--value-left", thumbLeft);
    }
  }, [context.rootRef, valueId, value?.value]);

  return value ? (
    <span ref={ref} {...props}>
      {formatValue ? formatValue(value.value) : value.value}
      {children}
    </span>
  ) : null;
};

export type SliderMarkerProps = {
  value: number;
} & ComponentProps<"span">;

const SliderMarker = ({
  value,
  style,
  children,
  ...props
}: SliderMarkerProps) => {
  const { min, max, registerMarker, unregisterMarker } = useSliderContext();
  const totalRange = max - min;
  const valuePercentage = ((value - min) / totalRange) * 100;

  useEffect(() => {
    registerMarker(value);
    return () => unregisterMarker(value);
  }, [registerMarker, unregisterMarker, value]);

  return (
    <span
      data-marker=""
      data-marker-value={value}
      style={{
        left: `calc(${valuePercentage}% - var(--thumb-width, 0px) * (${
          valuePercentage / 100 - 0.5
        }))`,
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
};

export const Slider = {
  Root: SliderRoot,
  Track: SliderTrack,
  Range: SliderRange,
  Thumb: SliderThumb,
  Value: SliderValue,
  Marker: SliderMarker,
  useSliderContext,
};
