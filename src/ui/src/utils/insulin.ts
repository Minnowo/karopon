export const CalcInsulin = (
    netCarbs: number,
    bloodGlucose: number,
    targetGlucose: number,
    insulinToCarbRatio: number,
    insulinSensitivityFactor: number
): number => {
    return netCarbs / insulinToCarbRatio + (bloodGlucose - targetGlucose) / insulinSensitivityFactor;
};
