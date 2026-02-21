export const CalcInsulin = (
    netCarbs: number,
    bloodGlucose: number,
    targetGlucose: number,
    insulinToCarbRatio: number,
    insulinSensitivityFactor: number
): number => {
    if (insulinSensitivityFactor === 0) {
        return 0;
    }

    const adjust = (bloodGlucose - targetGlucose) / insulinSensitivityFactor;

    if (netCarbs === 0) {
        return Math.max(0, adjust);
    }

    if (insulinToCarbRatio === 0) {
        return 0;
    }

    const carbAmt = netCarbs / insulinToCarbRatio;

    return Math.max(0, carbAmt + adjust);
};
