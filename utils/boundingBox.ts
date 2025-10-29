import { Position } from "@/utils/geometry"

export const getPointsBoundingBox = (points: Position[]) => {
  console.log({ points })
  if (points.length === 0) {
    return null // or throw an error
  }

  let minX = points[0].x
  let maxX = points[0].x
  let minY = points[0].y
  let maxY = points[0].y

  for (const point of points) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }

  return new DOMRect(minX, minY, maxX - minX, maxY - minY)
}
