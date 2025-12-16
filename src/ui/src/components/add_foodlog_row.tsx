import {useEffect, useRef} from 'preact/hooks';
import {TblUserFood, TblUserFoodLog} from '../api/types';
import {FuzzySearch} from './select_list';
import {NumberInput} from './number_input';
import {JSX} from 'preact/jsx-runtime';

type AddFoodlogPanelRowState = {
    food: TblUserFoodLog;
    foods: TblUserFood[];
    render: () => void;
    deleteSelf: () => void;
};

export function AddFoodlogPanelRow({foods, food, render, deleteSelf}: AddFoodlogPanelRowState) {
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
                        searchKey={'name'}
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
                <td className="whitespace-nowrap w-full pr-1">
                    <input
                        className="w-full min-w-8"
                        tabindex={-1}
                        type="text"
                        value={food.unit}
                        placeholder={'g'}
                        onInput={(e: JSX.TargetedInputEvent<HTMLInputElement>) => {
                            food.unit = e.currentTarget.value;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput
                        innerClassName="w-8"
                        round={1}
                        min={0}
                        value={food.portion}
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
                <td className="pr-1">
                    <NumberInput
                        innerClassName="w-8"
                        innerTabIndex={-1}
                        round={1}
                        min={0}
                        value={food.protein}
                        onValueChange={(v) => {
                            food.protein = v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput
                        innerClassName="w-8"
                        innerTabIndex={-1}
                        round={1}
                        min={0}
                        value={food.carb}
                        onValueChange={(v) => {
                            food.carb = v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput
                        innerClassName="w-8"
                        innerTabIndex={-1}
                        round={1}
                        min={0}
                        value={food.fibre}
                        onValueChange={(v) => {
                            food.fibre = v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput
                        innerClassName="w-8"
                        innerTabIndex={-1}
                        round={1}
                        min={0}
                        value={food.fat}
                        onValueChange={(v) => {
                            food.fat = v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1 text-center">{(food.carb - food.fibre).toFixed(1)}</td>
                <td>
                    <button tabindex={-1} className="bg-c-l-red hover:bg-c-red px-1" onClick={() => deleteSelf()}>
                        X
                    </button>
                </td>
            </tr>
        </>
    );
}
