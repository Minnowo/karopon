export enum CalorieFormula {
    Auto = 'auto',
    Atwater = 'atwater',
    AtwaterNoFibre = 'atwater_no_fibre',
}

const CaloriesAtwater = (protein: number, carbs: number, fibre: number, fat: number): number => {
    return protein * 4 + carbs * 4 + fibre * 2 + fat * 9;
};

const CaloriesAtwaterNoFibre = (protein: number, carbs: number, fibre: number, fat: number): number => {
    return protein * 4 + carbs * 4 + fibre * 0 + fat * 9;
};

export const Str2CalorieFormula = (str: string): CalorieFormula => {
    switch (str) {
        case CalorieFormula.Atwater:
            return CalorieFormula.Atwater;

        case CalorieFormula.AtwaterNoFibre:
            return CalorieFormula.AtwaterNoFibre;

        default:
        case CalorieFormula.Auto:
            return CalorieFormula.Auto;
    }
};
export const CalculateCalories = (
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
        case CalorieFormula.Auto:
            return CaloriesAtwater(protein, carbs, fibre, fat);
    }
};
