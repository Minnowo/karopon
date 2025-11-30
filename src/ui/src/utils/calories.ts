export enum CalorieFormula {
    Atwater = 'ATWATER',
    AtwaterNoFibre = 'ATWATER_NO_FIBRE',
}

const CaloriesAtwater = (protein: number, carbs: number, fibre: number, fat: number): number => {
    return protein * 4 + carbs * 4 + fibre * 2 + fat * 9;
};

const CaloriesAtwaterNoFibre = (protein: number, carbs: number, fibre: number, fat: number): number => {
    return protein * 4 + carbs * 4 + fibre * 0 + fat * 9;
};

export const Calories = (
    protein: number,
    carbs: number,
    fibre: number,
    fat: number,
    formula: CalorieFormula = CalorieFormula.Atwater
): number => {
    switch (formula) {
        case CalorieFormula.Atwater:
            return CaloriesAtwater(protein, carbs, fibre, fat);

        case CalorieFormula.AtwaterNoFibre:
            return CaloriesAtwaterNoFibre(protein, carbs, fibre, fat);

        default:
            // fallback safety
            return CaloriesAtwater(protein, carbs, fibre, fat);
    }
};
