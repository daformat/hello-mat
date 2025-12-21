import { Position } from "@/utils/geometry";

export const getPointsBoundingBox = (points: Position[]) => {
  if (points.length === 0) {
    return new DOMRect(0, 0, 0, 0); // or throw an error
  }

  let minX = points[0]?.x ?? -Infinity;
  let maxX = points[0]?.x ?? Infinity;
  let minY = points[0]?.y ?? -Infinity;
  let maxY = points[0]?.y ?? Infinity;

  for (const point of points) {
    if (point.x < minX) {
      minX = point.x;
    }
    if (point.x > maxX) {
      maxX = point.x;
    }
    if (point.y < minY) {
      minY = point.y;
    }
    if (point.y > maxY) {
      maxY = point.y;
    }
  }

  return new DOMRect(minX, minY, maxX - minX, maxY - minY);
};
