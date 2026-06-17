import { describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../__mocks__/prisma';

vi.mock('../../../lib/prisma', () => ({ prisma }));

import { calcPriorityScore, calcSwait } from '../../queue/priority-score.helper';

const weightedScore = (
  weights: {
    wbase: number;
    wwait: number;
    wage: number;
    wcls: number;
  },
  params: {
    sbase: number;
    waitMinutes: number;
    sage: number;
    scls: number;
  },
) => {
  return (
    weights.wbase * params.sbase +
    weights.wwait * calcSwait(params.waitMinutes) +
    weights.wage * params.sage +
    weights.wcls * params.scls
  );
};

describe('TC-P1..TC-P6: priority score formula', () => {
  it('TC-P1: tre <6 tuoi cho 5 phut phai cao hon nguoi thuong cho 40 phut', () => {
    // Nghiep vu: tre nho va cho it phut phai co diem uu tien cao hon nguoi thuong cho lau.
    const childScore = calcPriorityScore({
      sbase: 90,
      waitMinutes: 5,
      sage: 15,
      scls: 20,
    });
    const adultScore = calcPriorityScore({
      sbase: 60,
      waitMinutes: 40,
      sage: 60,
      scls: 20,
    });

    expect(childScore).toBeGreaterThan(adultScore);
  });

  it('TC-P2: Swait tai t=0 gan bang 100', () => {
    // Nghiep vu: moi vua vao hang cho thi gia tri Swait phai xap xi 100.
    expect(Math.abs(calcSwait(0) - 100)).toBeLessThan(0.01);
  });

  it('TC-P3: Swait tai t=45 gan bang 20', () => {
    // Nghiep vu: sau 45 phut, Swait phai roi ve muc xap xi 20.
    expect(Math.abs(calcSwait(45) - 20)).toBeLessThan(1);
  });

  it('TC-P4: Swait giam don dieu theo thoi gian', () => {
    // Nghiep vu: thoi gian cho tang thi Swait phai giam dan.
    expect(calcSwait(0)).toBeGreaterThan(calcSwait(10));
    expect(calcSwait(10)).toBeGreaterThan(calcSwait(30));
    expect(calcSwait(30)).toBeGreaterThan(calcSwait(60));
  });

  it('TC-P5: nguoi >=75 tuoi phai cao hon khuyet tat nang trong cung dieu kien gan nhau', () => {
    // Nghiep vu: trong cung lane, truong hop uu tien tuoi cao co the cao hon truong hop khuyet tat nang neu cho gan nhu nhau.
    const elderlyScore = calcPriorityScore({
      sbase: 30,
      waitMinutes: 5,
      sage: 15,
      scls: 20,
    });
    const disabledScore = calcPriorityScore({
      sbase: 15,
      waitMinutes: 10,
      sage: 15,
      scls: 20,
    });

    expect(elderlyScore).toBeGreaterThan(disabledScore);
  });

  it('TC-P6: bien thien w1 +/-5% khong dao top-1', () => {
    // Nghiep vu: thay doi nhe trong trong so khong duoc lam doi nguoi top-1.
    const child = {
      sbase: 90,
      waitMinutes: 5,
      sage: 15,
      scls: 20,
    };
    const adult = {
      sbase: 60,
      waitMinutes: 40,
      sage: 60,
      scls: 20,
    };

    const baseWeights = { wbase: 0.4, wwait: 0.3, wage: 0.15, wcls: 0.15 };
    const perturbedWeights = { wbase: 0.42, wwait: 0.29, wage: 0.15, wcls: 0.14 };

    expect(weightedScore(baseWeights, child)).toBeGreaterThan(weightedScore(baseWeights, adult));
    expect(weightedScore(perturbedWeights, child)).toBeGreaterThan(weightedScore(perturbedWeights, adult));
  });
});
