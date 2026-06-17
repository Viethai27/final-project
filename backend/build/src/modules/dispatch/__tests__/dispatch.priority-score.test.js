"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../../__mocks__/prisma");
vitest_1.vi.mock('../../../lib/prisma', () => ({ prisma: prisma_1.prisma }));
const priority_score_helper_1 = require("../../queue/priority-score.helper");
const weightedScore = (weights, params) => {
    return (weights.wbase * params.sbase +
        weights.wwait * (0, priority_score_helper_1.calcSwait)(params.waitMinutes) +
        weights.wage * params.sage +
        weights.wcls * params.scls);
};
(0, vitest_1.describe)('TC-P1..TC-P6: priority score formula', () => {
    (0, vitest_1.it)('TC-P1: tre <6 tuoi cho 5 phut phai cao hon nguoi thuong cho 40 phut', () => {
        // Nghiep vu: tre nho va cho it phut phai co diem uu tien cao hon nguoi thuong cho lau.
        const childScore = (0, priority_score_helper_1.calcPriorityScore)({
            sbase: 90,
            waitMinutes: 5,
            sage: 15,
            scls: 20,
        });
        const adultScore = (0, priority_score_helper_1.calcPriorityScore)({
            sbase: 60,
            waitMinutes: 40,
            sage: 60,
            scls: 20,
        });
        (0, vitest_1.expect)(childScore).toBeGreaterThan(adultScore);
    });
    (0, vitest_1.it)('TC-P2: Swait tai t=0 gan bang 100', () => {
        // Nghiep vu: moi vua vao hang cho thi gia tri Swait phai xap xi 100.
        (0, vitest_1.expect)(Math.abs((0, priority_score_helper_1.calcSwait)(0) - 100)).toBeLessThan(0.01);
    });
    (0, vitest_1.it)('TC-P3: Swait tai t=45 gan bang 20', () => {
        // Nghiep vu: sau 45 phut, Swait phai roi ve muc xap xi 20.
        (0, vitest_1.expect)(Math.abs((0, priority_score_helper_1.calcSwait)(45) - 20)).toBeLessThan(1);
    });
    (0, vitest_1.it)('TC-P4: Swait giam don dieu theo thoi gian', () => {
        // Nghiep vu: thoi gian cho tang thi Swait phai giam dan.
        (0, vitest_1.expect)((0, priority_score_helper_1.calcSwait)(0)).toBeGreaterThan((0, priority_score_helper_1.calcSwait)(10));
        (0, vitest_1.expect)((0, priority_score_helper_1.calcSwait)(10)).toBeGreaterThan((0, priority_score_helper_1.calcSwait)(30));
        (0, vitest_1.expect)((0, priority_score_helper_1.calcSwait)(30)).toBeGreaterThan((0, priority_score_helper_1.calcSwait)(60));
    });
    (0, vitest_1.it)('TC-P5: nguoi >=75 tuoi phai cao hon khuyet tat nang trong cung dieu kien gan nhau', () => {
        // Nghiep vu: trong cung lane, truong hop uu tien tuoi cao co the cao hon truong hop khuyet tat nang neu cho gan nhu nhau.
        const elderlyScore = (0, priority_score_helper_1.calcPriorityScore)({
            sbase: 30,
            waitMinutes: 5,
            sage: 15,
            scls: 20,
        });
        const disabledScore = (0, priority_score_helper_1.calcPriorityScore)({
            sbase: 15,
            waitMinutes: 10,
            sage: 15,
            scls: 20,
        });
        (0, vitest_1.expect)(elderlyScore).toBeGreaterThan(disabledScore);
    });
    (0, vitest_1.it)('TC-P6: bien thien w1 +/-5% khong dao top-1', () => {
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
        (0, vitest_1.expect)(weightedScore(baseWeights, child)).toBeGreaterThan(weightedScore(baseWeights, adult));
        (0, vitest_1.expect)(weightedScore(perturbedWeights, child)).toBeGreaterThan(weightedScore(perturbedWeights, adult));
    });
});
