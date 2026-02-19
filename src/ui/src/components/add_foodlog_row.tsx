import {useEffect, useRef} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserFoodLog} from '../api/types';
import {FuzzySearch} from './select_list';
import {NumberInput} from './number_input';
import {CalculateCalories, Str2CalorieFormula} from '../utils/calories';

type AddFoodlogPanelRowState = {
    user: TblUser;
    food: TblUserFoodLog;
    foods: TblUserFood[];
    render: () => void;
    deleteSelf: () => void;
    showNetCarb?: boolean;
    showCalories?: boolean;
};

export function AddFoodlogPanelRow({
    user,
    foods,
    food,
    render,
    deleteSelf,
    showNetCarb = true,
    showCalories = true,
}: AddFoodlogPanelRowState) {
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

    return (
        <>
            <tr>
                <td className="whitespace-nowrap w-full pr-1">
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
                        className="w-full min-w-32 my-1 sm:mr-1"
                        placeholder="Food Name"
                        noResultsText="New Food"
                        onSelect={(newFood: TblUserFood | null) => {
                            if (!newFood) {
                                // The user may be creating a new food.
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
                </td>
                <td className="pr-1">
                    <NumberInput
                        innerClassName="w-full min-w-[5ch]"
                        precision={1}
                        min={0}
                        label={food.unit}
                        value={food.portion}
                        labelOnLeftSide={false}
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
                </td>
                <td className="pr-2 text-right"> {food.fat.toFixed(1)} </td>
                <td className="pr-2 text-right"> {food.carb.toFixed(1)} </td>
                <td className="pr-2 text-right"> {food.fibre.toFixed(1)} </td>
                <td className="pr-2 text-right">{food.protein.toFixed(1)} </td>
                {showNetCarb && <td className="pr-2 text-right">{(food.carb - food.fibre).toFixed(1)}</td>}
                {showCalories && (
                    <td className="pr-2 text-right">
                        {CalculateCalories(
                            food.protein,
                            food.carb - food.fibre,
                            food.fibre,
                            food.fat,

                            Str2CalorieFormula(user.caloric_calc_method)
                        ).toFixed(0)}
                    </td>
                )}
                <td>
                    <button tabindex={-1} className="bg-c-red hover:bg-c-red px-1" onClick={() => deleteSelf()}>
                        X
                    </button>
                </td>
            </tr>
        </>
    );
}
