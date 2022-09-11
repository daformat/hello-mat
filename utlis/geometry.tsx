export type Position = { x: number; y: number }
export type Vector = {
  // Horizontal component
  dx: number
  // Vertical component
  dy: number
  // Magnitude (length)
  mag: number
  // Unit vector
  unit: Position
  // Normal vector
  normal: Position
  // Starting point
  p1: Position
  // Ending point
  p2: Position
  // Angle from origin
  angle: {
    radians: number
    normalized: number
    degrees: number
    degreesNormalized: number
  }
}
/**
 * Returns a ( p1 o-> p2 ) vector object
 * given p1 and p2 objects with the shape {x: number, y: number}
 * @param p1
 * @param p2
 * @returns
 */
export function vec(p1: Position, p2: Position): Vector {
  // horizontal and vertical vector components
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  // magnitude of the vector (distance)
  const mag = Math.hypot(dx, dy)
  // unit vector
  const unit = mag !== 0 ? { x: dx / mag, y: dy / mag } : { x: 0, y: 0 }
  // normal vector
  const normal = rotate(unit, { x: 0, y: 0 }, Math.PI / 2)
  // Angle in radians
  const radians = Math.atan2(dy, dx)
  // Normalize to clock-wise circle
  const normalized = 2 * Math.PI + (Math.round(radians) % (2 * Math.PI))
  // Angle in degrees
  const degrees = (180 * radians) / Math.PI
  const degreesNormalized = (360 + Math.round(degrees)) % 360
  return {
    dx,
    dy,
    mag,
    unit,
    normal,
    p1: { ...p1 },
    p2: { ...p2 },
    angle: {
      radians,
      normalized,
      degrees,
      degreesNormalized,
    },
  }
}
function rotate(point: Position, center: Position, radians: number) {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const nx = cos * (point.x - center.x) + sin * (point.y - center.y) + center.x
  const ny = cos * (point.y - center.y) - sin * (point.x - center.x) + center.y
  return { x: nx, y: ny }
}
export function translate(
  point: Position,
  vec: Position,
  length = 1,
  direction = 1
) {
  const resultingPoint: Position = {
    x: point.x + vec.x * direction * length,
    y: point.y + vec.y * direction * length,
  }
  return resultingPoint
}
export function plotCircle(
  center: Position,
  radius: number,
  subidivsions = 8,
  precision = 4
): Position[] {
  const points = []
  for (let i = 0; i < subidivsions; i++) {
    const x = +(
      center.x +
      radius * Math.cos((2 * Math.PI * i) / subidivsions)
    ).toFixed(precision)
    const y = +(
      center.y +
      radius * Math.sin((2 * Math.PI * i) / subidivsions)
    ).toFixed(precision)
    points.push({ x, y })
  }
  return points
}
