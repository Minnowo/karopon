import {useEffect, useId, useRef} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserFoodLog} from '../api/types';
import {FuzzySearch} from './select_list';
import {NumberInput} from './number_input';
import {FieldError} from './field_error';
import {CalculateCalories, Str2CalorieFormula} from '../utils/calories';
import {Icon} from './icons';

type AddFoodlogPanelRowState = {
    user: TblUser;
    food: TblUserFoodLog;
    foods: TblUserFood[];
    render: () => void;
    deleteSelf: () => void;
    showNetCarb?: boolean;
    showCalories?: boolean;
    // Messages from the server for this row's name and amount, if it rejected them.
    nameError?: string;
    portionError?: string;
};

export function AddFoodlogPanelRow({
    user,
    foods,
    food,
    render,
    deleteSelf,
    showNetCarb = true,
    showCalories = true,
    nameError = undefined,
    portionError = undefined,
}: AddFoodlogPanelRowState) {
    const baseId = useId();
    const nameErrorId = `${baseId}-name-error`;
    const portionErrorId = `${baseId}-portion-error`;
    // This only holds the base carb, fat, protein, fibre when the portion is 1.
    // We use this to scale by the portion, but still let the user type manually.
    const foodTemplate = useRef<TblUserFoodLog>({name: food.name} as TblUserFoodLog);

    useEffect(() => {
        if (food.name !== '') {
            for (let i = 0; i < foods.length; i++) {
                const match = foods[i];
                if (match.name === food.name) {
                    foodTemplate.current.id = match.id;
                    foodTemplate.current.unit = match.unit;
                    foodTemplate.current.portion = 1;
                    foodTemplate.current.protein = match.protein;
                    foodTemplate.current.carb = match.carb;
                    foodTemplate.current.fibre = match.fibre;
                    foodTemplate.current.fat = match.fat;
                    break;
                }
            }
        }
    }, [food, foods]);

    const calories = CalculateCalories(
        food.protein,
        food.carb - food.fibre,
        food.fibre,
        food.fat,
        Str2CalorieFormula(user.caloric_calc_method)
    );
    const macros = [
        `Fat ${food.fat.toFixed(1)}`,
        `Carb ${food.carb.toFixed(1)}`,
        `Fibre ${food.fibre.toFixed(1)}`,
        `Protein ${food.protein.toFixed(1)}`,
        ...(showNetCarb ? [`Net ${(food.carb - food.fibre).toFixed(1)}`] : []),
        ...(showCalories ? [`${calories.toFixed(0)} kcal`] : []),
    ];

    // A card per food: name, then amount and remove; the macros on a muted line
    // once a saved food is picked. Wraps to two lines on narrow screens.
    return (
        <li className="surface-2 flex flex-col gap-1">
            <div className="flex flex-wrap items-start gap-2">
                <div className="flex min-w-40 flex-1 flex-col gap-1">
                    <FuzzySearch<TblUserFood>
                        query={foodTemplate.current.name}
                        onQueryChange={(q) => {
                            foodTemplate.current.name = q;
                            food.name = q;
                            render();
                        }}
                        data={foods}
                        dataDisplayStr={(d: TblUserFood) => `${d.name} (${d.unit})`}
                        dataSearchStr={(d: TblUserFood) => d.name}
                        className="w-full"
                        placeholder="Food Name"
                        noResultsText="No saved food found"
                        invalid={nameError !== undefined}
                        errorId={nameErrorId}
                        onSelect={(newFood: TblUserFood | null) => {
                            if (!newFood) {
                                // No saved food picked; the server rejects a food that is not saved.
                                food.name = foodTemplate.current.name;
                                return;
                            }
                            // Purposefully update the obj instead of assigning it.
                            // We want the caller's object to be modified by this.
                            food.id = newFood.id;
                            food.name = newFood.name;
                            food.unit = newFood.unit;
                            food.portion = 1;
                            food.protein = newFood.protein;
                            food.fat = newFood.fat;
                            food.fibre = newFood.fibre;
                            food.carb = newFood.carb;
                            foodTemplate.current = {...food};
                            render();
                        }}
                    />
                    <FieldError id={nameErrorId} message={nameError} />
                </div>
                <div className="flex items-start gap-2">
                    {/* Sized for 4 digits and the unit: larger amounts are rare, and the name gets the room. */}
                    <div className="flex flex-col gap-1">
                        <NumberInput
                            innerClassName="w-[6ch]"
                            precision={1}
                            min={0}
                            label={food.unit || undefined}
                            ariaLabel="Amount"
                            // The unit comes from the picked saved food; without one there is nothing to measure.
                            disabled={!food.unit}
                            value={food.portion}
                            labelOnLeftSide={false}
                            invalid={portionError !== undefined}
                            errorId={portionErrorId}
                            onValueChange={(v) => {
                                food.portion = v;
                                if (foodTemplate.current.id > 0) {
                                    food.carb = foodTemplate.current.carb * v;
                                    food.protein = foodTemplate.current.protein * v;
                                    food.fat = foodTemplate.current.fat * v;
                                    food.fibre = foodTemplate.current.fibre * v;
                                }
                                render();
                            }}
                        />
                        <FieldError id={portionErrorId} message={portionError} />
                    </div>
                    <button
                        type="button"
                        tabindex={-1}
                        className="btn-outlined-error"
                        aria-label={food.name ? `Remove ${food.name}` : 'Remove food row'}
                        onClick={() => deleteSelf()}
                    >
                        <Icon name="close" />
                    </button>
                </div>
            </div>
            {food.unit && (
                <small className="flex flex-wrap gap-x-3">
                    {macros.map((m) => (
                        <span key={m}>{m}</span>
                    ))}
                </small>
            )}
        </li>
    );
}
