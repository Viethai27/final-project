export function calcSwait(waitMinutes: number): number {
  return 100 * Math.exp(-0.035 * waitMinutes);
}

export function calcPriorityScore(params: {
  sbase: number;
  waitMinutes: number;
  sage: number;
  scls: number;
}): number {
  const swait = calcSwait(params.waitMinutes);

  return (
    0.4 * params.sbase +
    0.3 * swait +
    0.15 * params.sage +
    0.15 * params.scls
  );
}
