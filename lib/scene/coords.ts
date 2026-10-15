/** Round a coordinate to 1 decimal place. */
export function roundCoord(value: number): number {
  return Math.round(value * 10) / 10;
}
