import {DropdownButton} from '../../components/drop_down_button';

import {useState, useRef} from 'preact/hooks';
import {TblUserFood} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {JSX} from 'preact/jsx-runtime';

type AddFoodPanelProps = {
    food: TblUserFood;
    addFood: (food: TblUserFood) => void;
    onCancelClick?: () => void;
    className?: string;
};

export function AddFoodPanel({food, addFood, className, onCancelClick}: AddFoodPanelProps) {
    const tmpFood = useRef<TblUserFood>({} as TblUserFood);
    const foodName = useRef<HTMLInputElement>(null);
    const foodUnit = useRef<HTMLInputElement>(null);

    const onSaveClick = () => {
        const newFood = {...food, ...tmpFood.current};
        if (foodName.current?.value) {
            newFood.name = foodName.current.value;
        }
        if (foodUnit.current?.value) {
            newFood.unit = foodUnit.current.value;
        }
        addFood(newFood);
    };

    return (
        <div key={food.id} className={`rounded-sm p-2 border container-theme ${className}`}>
            <span className="text-lg">Add Food</span>
            <div className="flex justify-between font-semibold">
                <div class="w-full px-1">
                    <input
                        class="mb-2 whitespace-nowrap w-full"
                        type="text"
                        ref={foodName}
                        value={food.name}
                        placeholder="Food Name"
                    />
                    <input
                        class="mb-2 whitespace-nowrap w-full"
                        type="text"
                        ref={foodUnit}
                        value={food.unit}
                        placeholder="Portion Unit"
                    />
                    <NumberInput
                        class={'whitespace-nowrap'}
                        label={'Portion'}
                        value={food.portion}
                        onChange={(portion: number) => (tmpFood.current.portion = portion)}
                    />
                </div>

                <div class="text-right pl-1">
                    <button class="w-full mb-2" onClick={onCancelClick}>
                        Cancel
                    </button>
                    <button class="w-full" onClick={onSaveClick}>
                        Save
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap">
                <NumberInput
                    class={'mx-1 mt-2 whitespace-nowrap'}
                    label={'Protein'}
                    value={food.protein}
                    onChange={(protein: number) => (tmpFood.current.protein = protein)}
                />
                <NumberInput
                    class={'mx-1 mt-2 whitespace-nowrap'}
                    label={'Carb'}
                    value={food.carb}
                    onChange={(carb: number) => (tmpFood.current.carb = carb)}
                />
                <NumberInput
                    class={'mx-1 mt-2 whitespace-nowrap'}
                    label={'Fibre'}
                    value={food.fibre}
                    onChange={(fibre: number) => (tmpFood.current.fibre = fibre)}
                />
                <NumberInput
                    class={'mx-1 mt-2 whitespace-nowrap'}
                    label={'Fat'}
                    value={food.fat}
                    onChange={(fat: number) => (tmpFood.current.fat = fat)}
                />
            </div>
        </div>
    );
}
