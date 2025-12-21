/**
 * type guard to check if a value is not undefined
 */
export const isDefined = <T>(value: T | undefined): value is T => {
  return value !== undefined;
};

/**
 * type guard to check if a value is not null
 */
export const isNotNull = <T>(value: T | null): value is T => {
  return value !== null;
};

/**
 * type guard to check if a value is non-nullable (not null and not undefined)
 */
export const isNonNullable = <T>(value: T): value is NonNullable<T> => {
  return isDefined(value) && isNotNull(value);
};
