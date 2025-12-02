export const CalcInsulin = (
    netCarbs: number,
    bloodGlucose: number,
    targetGlucose: number,
    insulinToCarbRatio: number,
    insulinSensitivityFactor: number
): number => {

    if (netCarbs === 0) {
        return (bloodGlucose - targetGlucose) / insulinSensitivityFactor;
    }

    return netCarbs / insulinToCarbRatio + (bloodGlucose - targetGlucose) / insulinSensitivityFactor;

};
