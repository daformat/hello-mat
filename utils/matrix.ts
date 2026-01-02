interface DecomposedMatrix {
  translate: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  skew: { xy: number; xz: number; yz: number };
  rotate: { x: number; y: number; z: number }; // in degrees
  perspective: { x: number; y: number; z: number; w: number };
}

/**
 * Decomposes a CSS matrix or matrix3d into its component transformations
 * @param matrix - Array of 6 numbers (matrix) or 16 numbers (matrix3d)
 * @returns Decomposed transformation values
 */
export function decomposeMatrix(matrix: number[]): DecomposedMatrix {
  let matrix3d: number[];

  if (matrix.length === 6) {
    // Convert 2D matrix to 3D matrix
    // matrix(a, b, c, d, tx, ty) becomes:
    // matrix3d(a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1)
    matrix3d = [
      matrix[0],
      matrix[1],
      0,
      0,
      matrix[2],
      matrix[3],
      0,
      0,
      0,
      0,
      1,
      0,
      matrix[4],
      matrix[5],
      0,
      1,
    ];
  } else if (matrix.length === 16) {
    matrix3d = matrix;
  } else {
    throw new Error(
      "Matrix must have either 6 elements (2D) or 16 elements (3D)"
    );
  }

  // Create a copy as a 4x4 matrix (row-major)
  const m = [
    [matrix3d[0], matrix3d[1], matrix3d[2], matrix3d[3]],
    [matrix3d[4], matrix3d[5], matrix3d[6], matrix3d[7]],
    [matrix3d[8], matrix3d[9], matrix3d[10], matrix3d[11]],
    [matrix3d[12], matrix3d[13], matrix3d[14], matrix3d[15]],
  ];

  // Normalize the matrix
  if (m[3][3] === 0) {
    throw new Error("Matrix cannot be decomposed (m44 is 0)");
  }

  // Normalize by dividing by m[3][3]
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      m[i][j] /= m[3][3];
    }
  }

  // perspectiveMatrix is used to solve for perspective
  const perspectiveMatrix = m.map((row) => [...row]);
  for (let i = 0; i < 3; i++) {
    perspectiveMatrix[i][3] = 0;
  }
  perspectiveMatrix[3][3] = 1;

  // Extract perspective
  const perspective = { x: 0, y: 0, z: 0, w: 1 };

  if (m[0][3] !== 0 || m[1][3] !== 0 || m[2][3] !== 0) {
    // Right-hand side
    const rhs = [m[0][3], m[1][3], m[2][3], m[3][3]];

    // Solve equation by inverting perspectiveMatrix
    const inversePerspective = invertMatrix4x4(perspectiveMatrix);
    if (inversePerspective) {
      const transposedInverse = transposeMatrix4x4(inversePerspective);
      perspective.x =
        rhs[0] * transposedInverse[0][0] +
        rhs[1] * transposedInverse[0][1] +
        rhs[2] * transposedInverse[0][2] +
        rhs[3] * transposedInverse[0][3];
      perspective.y =
        rhs[0] * transposedInverse[1][0] +
        rhs[1] * transposedInverse[1][1] +
        rhs[2] * transposedInverse[1][2] +
        rhs[3] * transposedInverse[1][3];
      perspective.z =
        rhs[0] * transposedInverse[2][0] +
        rhs[1] * transposedInverse[2][1] +
        rhs[2] * transposedInverse[2][2] +
        rhs[3] * transposedInverse[2][3];
      perspective.w =
        rhs[0] * transposedInverse[3][0] +
        rhs[1] * transposedInverse[3][1] +
        rhs[2] * transposedInverse[3][2] +
        rhs[3] * transposedInverse[3][3];
    }

    // Clear perspective partition
    m[0][3] = m[1][3] = m[2][3] = 0;
    m[3][3] = 1;
  }

  // Extract translation
  const translate = {
    x: m[3][0],
    y: m[3][1],
    z: m[3][2],
  };

  // Clear translation
  m[3][0] = m[3][1] = m[3][2] = 0;

  // Extract scale and shear
  const row: number[][] = [
    [m[0][0], m[0][1], m[0][2]],
    [m[1][0], m[1][1], m[1][2]],
    [m[2][0], m[2][1], m[2][2]],
  ];

  // Compute X scale factor and normalize first row
  const scaleX = Math.sqrt(
    row[0][0] * row[0][0] + row[0][1] * row[0][1] + row[0][2] * row[0][2]
  );
  row[0] = row[0].map((v) => v / scaleX);

  // Compute XY shear factor and orthogonalize second row
  const skewXY =
    row[0][0] * row[1][0] + row[0][1] * row[1][1] + row[0][2] * row[1][2];
  row[1] = [
    row[1][0] - skewXY * row[0][0],
    row[1][1] - skewXY * row[0][1],
    row[1][2] - skewXY * row[0][2],
  ];

  // Compute Y scale and normalize second row
  const scaleY = Math.sqrt(
    row[1][0] * row[1][0] + row[1][1] * row[1][1] + row[1][2] * row[1][2]
  );
  row[1] = row[1].map((v) => v / scaleY);
  const skewXYNormalized = skewXY / scaleY;

  // Compute XZ and YZ shears, orthogonalize third row
  const skewXZ =
    row[0][0] * row[2][0] + row[0][1] * row[2][1] + row[0][2] * row[2][2];
  row[2] = [
    row[2][0] - skewXZ * row[0][0],
    row[2][1] - skewXZ * row[0][1],
    row[2][2] - skewXZ * row[0][2],
  ];

  const skewYZ =
    row[1][0] * row[2][0] + row[1][1] * row[2][1] + row[1][2] * row[2][2];
  row[2] = [
    row[2][0] - skewYZ * row[1][0],
    row[2][1] - skewYZ * row[1][1],
    row[2][2] - skewYZ * row[1][2],
  ];

  // Get Z scale and normalize third row
  const scaleZ = Math.sqrt(
    row[2][0] * row[2][0] + row[2][1] * row[2][1] + row[2][2] * row[2][2]
  );
  row[2] = row[2].map((v) => v / scaleZ);
  const skewXZNormalized = skewXZ / scaleZ;
  const skewYZNormalized = skewYZ / scaleZ;

  // Check for coordinate system flip (negative determinant)
  const pdum3 = cross(row[1], row[2]);
  if (dot(row[0], pdum3) < 0) {
    // Flip all scales and rows
    row[0] = row[0].map((v) => -v);
    row[1] = row[1].map((v) => -v);
    row[2] = row[2].map((v) => -v);
  }

  // Extract rotation (convert to degrees)
  const rotateY = Math.asin(-row[0][2]);

  let rotateX: number, rotateZ: number;

  if (Math.abs(Math.cos(rotateY)) > 0.00001) {
    rotateX = Math.atan2(row[1][2], row[2][2]);
    rotateZ = Math.atan2(row[0][1], row[0][0]);
  } else {
    rotateX = Math.atan2(-row[2][1], row[1][1]);
    rotateZ = 0;
  }

  const toDegrees = (rad: number) => rad * (180 / Math.PI);

  return {
    translate,
    scale: { x: scaleX, y: scaleY, z: scaleZ },
    skew: {
      xy: skewXYNormalized,
      xz: skewXZNormalized,
      yz: skewYZNormalized,
    },
    rotate: {
      x: toDegrees(rotateX),
      y: toDegrees(rotateY),
      z: toDegrees(rotateZ),
    },
    perspective,
  };
}

// Helper functions
function dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function invertMatrix4x4(m: number[][]): number[][] | null {
  const inv: number[][] = Array(4)
    .fill(0)
    .map(() => Array(4).fill(0));

  inv[0][0] =
    m[1][1] * m[2][2] * m[3][3] -
    m[1][1] * m[2][3] * m[3][2] -
    m[2][1] * m[1][2] * m[3][3] +
    m[2][1] * m[1][3] * m[3][2] +
    m[3][1] * m[1][2] * m[2][3] -
    m[3][1] * m[1][3] * m[2][2];
  inv[1][0] =
    -m[1][0] * m[2][2] * m[3][3] +
    m[1][0] * m[2][3] * m[3][2] +
    m[2][0] * m[1][2] * m[3][3] -
    m[2][0] * m[1][3] * m[3][2] -
    m[3][0] * m[1][2] * m[2][3] +
    m[3][0] * m[1][3] * m[2][2];
  inv[2][0] =
    m[1][0] * m[2][1] * m[3][3] -
    m[1][0] * m[2][3] * m[3][1] -
    m[2][0] * m[1][1] * m[3][3] +
    m[2][0] * m[1][3] * m[3][1] +
    m[3][0] * m[1][1] * m[2][3] -
    m[3][0] * m[1][3] * m[2][1];
  inv[3][0] =
    -m[1][0] * m[2][1] * m[3][2] +
    m[1][0] * m[2][2] * m[3][1] +
    m[2][0] * m[1][1] * m[3][2] -
    m[2][0] * m[1][2] * m[3][1] -
    m[3][0] * m[1][1] * m[2][2] +
    m[3][0] * m[1][2] * m[2][1];

  const det =
    m[0][0] * inv[0][0] +
    m[0][1] * inv[1][0] +
    m[0][2] * inv[2][0] +
    m[0][3] * inv[3][0];

  if (Math.abs(det) < 0.00001) {
    return null;
  }

  inv[0][1] =
    -m[0][1] * m[2][2] * m[3][3] +
    m[0][1] * m[2][3] * m[3][2] +
    m[2][1] * m[0][2] * m[3][3] -
    m[2][1] * m[0][3] * m[3][2] -
    m[3][1] * m[0][2] * m[2][3] +
    m[3][1] * m[0][3] * m[2][2];
  inv[1][1] =
    m[0][0] * m[2][2] * m[3][3] -
    m[0][0] * m[2][3] * m[3][2] -
    m[2][0] * m[0][2] * m[3][3] +
    m[2][0] * m[0][3] * m[3][2] +
    m[3][0] * m[0][2] * m[2][3] -
    m[3][0] * m[0][3] * m[2][2];
  inv[2][1] =
    -m[0][0] * m[2][1] * m[3][3] +
    m[0][0] * m[2][3] * m[3][1] +
    m[2][0] * m[0][1] * m[3][3] -
    m[2][0] * m[0][3] * m[3][1] -
    m[3][0] * m[0][1] * m[2][3] +
    m[3][0] * m[0][3] * m[2][1];
  inv[3][1] =
    m[0][0] * m[2][1] * m[3][2] -
    m[0][0] * m[2][2] * m[3][1] -
    m[2][0] * m[0][1] * m[3][2] +
    m[2][0] * m[0][2] * m[3][1] +
    m[3][0] * m[0][1] * m[2][2] -
    m[3][0] * m[0][2] * m[2][1];
  inv[0][2] =
    m[0][1] * m[1][2] * m[3][3] -
    m[0][1] * m[1][3] * m[3][2] -
    m[1][1] * m[0][2] * m[3][3] +
    m[1][1] * m[0][3] * m[3][2] +
    m[3][1] * m[0][2] * m[1][3] -
    m[3][1] * m[0][3] * m[1][2];
  inv[1][2] =
    -m[0][0] * m[1][2] * m[3][3] +
    m[0][0] * m[1][3] * m[3][2] +
    m[1][0] * m[0][2] * m[3][3] -
    m[1][0] * m[0][3] * m[3][2] -
    m[3][0] * m[0][2] * m[1][3] +
    m[3][0] * m[0][3] * m[1][2];
  inv[2][2] =
    m[0][0] * m[1][1] * m[3][3] -
    m[0][0] * m[1][3] * m[3][1] -
    m[1][0] * m[0][1] * m[3][3] +
    m[1][0] * m[0][3] * m[3][1] +
    m[3][0] * m[0][1] * m[1][3] -
    m[3][0] * m[0][3] * m[1][1];
  inv[3][2] =
    -m[0][0] * m[1][1] * m[3][2] +
    m[0][0] * m[1][2] * m[3][1] +
    m[1][0] * m[0][1] * m[3][2] -
    m[1][0] * m[0][2] * m[3][1] -
    m[3][0] * m[0][1] * m[1][2] +
    m[3][0] * m[0][2] * m[1][1];
  inv[0][3] =
    -m[0][1] * m[1][2] * m[2][3] +
    m[0][1] * m[1][3] * m[2][2] +
    m[1][1] * m[0][2] * m[2][3] -
    m[1][1] * m[0][3] * m[2][2] -
    m[2][1] * m[0][2] * m[1][3] +
    m[2][1] * m[0][3] * m[1][2];
  inv[1][3] =
    m[0][0] * m[1][2] * m[2][3] -
    m[0][0] * m[1][3] * m[2][2] -
    m[1][0] * m[0][2] * m[2][3] +
    m[1][0] * m[0][3] * m[2][2] +
    m[2][0] * m[0][2] * m[1][3] -
    m[2][0] * m[0][3] * m[1][2];
  inv[2][3] =
    -m[0][0] * m[1][1] * m[2][3] +
    m[0][0] * m[1][3] * m[2][1] +
    m[1][0] * m[0][1] * m[2][3] -
    m[1][0] * m[0][3] * m[2][1] -
    m[2][0] * m[0][1] * m[1][3] +
    m[2][0] * m[0][3] * m[1][1];
  inv[3][3] =
    m[0][0] * m[1][1] * m[2][2] -
    m[0][0] * m[1][2] * m[2][1] -
    m[1][0] * m[0][1] * m[2][2] +
    m[1][0] * m[0][2] * m[2][1] +
    m[2][0] * m[0][1] * m[1][2] -
    m[2][0] * m[0][2] * m[1][1];

  const invDet = 1.0 / det;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      inv[i][j] *= invDet;
    }
  }

  return inv;
}

function transposeMatrix4x4(m: number[][]): number[][] {
  return [
    [m[0][0], m[1][0], m[2][0], m[3][0]],
    [m[0][1], m[1][1], m[2][1], m[3][1]],
    [m[0][2], m[1][2], m[2][2], m[3][2]],
    [m[0][3], m[1][3], m[2][3], m[3][3]],
  ];
}
