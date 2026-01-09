export const KgToLbs = (kg: number) => kg * 2.2046226218;

export const LbsToKg = (lbs: number) => lbs / 2.2046226218;

export const CmToFeetInches = (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return {feet, inches};
};

export const FeetInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * 2.54;
