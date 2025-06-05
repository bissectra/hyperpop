// Matrix Utilities
const identityMatrix = (n) =>
  [...Array(n)].map((_, i) => [...Array(n)].map((_, j) => (i === j ? 1 : 0)));

const matVecMult = (mat, vec) =>
  mat.map((row) => row.reduce((sum, v, i) => sum + v * vec[i], 0));

const matMatMult = (a, b) =>
  a.map((row, i) =>
    row.map((_, j) => row.reduce((sum, _, k) => sum + a[i][k] * b[k][j], 0))
  );

// Transformation Matrices
const translationMatrix = (x, y, z, w) => {
  const m = identityMatrix(5);
  m[0][4] = x;
  m[1][4] = y;
  m[2][4] = z;
  m[3][4] = w;
  return m;
};

const rotationMatrix = (i, j, angle) => {
  const m = identityMatrix(5);
  m[i][i] = m[j][j] = Math.cos(angle);
  m[i][j] = -Math.sin(angle);
  m[j][i] = -m[i][j];
  return m;
};

const rotationAboutPoint = (point, i, j, angle) => {
  const [x, y, z, w] = point;
  const toOrigin = translationMatrix(-x, -y, -z, -w);
  const back = translationMatrix(x, y, z, w);
  const rotation = rotationMatrix(i, j, angle);
  return matMatMult(back, matMatMult(rotation, toOrigin));
};

// Debugging Utility
function printMatrix(matrix) {
  matrix.forEach((row) => {
    const formattedRow = row.map((value) => value.toFixed(2));
    console.log(formattedRow.join(' '));
  });
}