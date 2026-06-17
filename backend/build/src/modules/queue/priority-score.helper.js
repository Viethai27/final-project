"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcSwait = calcSwait;
exports.calcPriorityScore = calcPriorityScore;
function calcSwait(waitMinutes) {
    return 100 * Math.exp(-0.035 * waitMinutes);
}
function calcPriorityScore(params) {
    const swait = calcSwait(params.waitMinutes);
    return (0.4 * params.sbase +
        0.3 * swait +
        0.15 * params.sage +
        0.15 * params.scls);
}
