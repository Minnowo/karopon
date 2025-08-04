import {useState, useRef} from 'preact/hooks';
import {TblUserFood} from '../api/types';
import {NumberInput} from './number_input';
import {DropdownButton} from './drop_down_button';

type FoodEditPanelProps = {
    food: TblUserFood;
    updateFood: (food: TblUserFood) => void;
};

export function FoodEditPanel({food, updateFood}: FoodEditPanelProps) {
    const tmpFood = useRef<TblUserFood>({} as TblUserFood);
    const foodName = useRef<HTMLInputElement>(null);
    const foodUnit = useRef<HTMLInputElement>(null);
    const [showUpdatePanel, setShowUpdatePanel] = useState<boolean>(false);

    const onEditClicked = () => {
        setShowUpdatePanel(!showUpdatePanel);
    };

    const onCancelClick = () => {
        setShowUpdatePanel(false);
    };

    const onSaveClick = () => {
        const newFood = {...food, ...tmpFood.current};
        if (foodName.current?.value) {
            newFood.name = foodName.current.value;
        }
        if (foodUnit.current?.value) {
            newFood.unit = foodUnit.current.value;
        }
        updateFood(newFood);
        setShowUpdatePanel(false);
    };

    return (
        <div key={food.id} className="rounded-sm p-2 border container-theme">
            <div className="flex justify-between font-semibold mb-2">
                {showUpdatePanel ? (
                    <div class="w-full px-1">
                        <input class="mb-2 whitespace-nowrap w-full" type="text" ref={foodName} value={food.name} />
                        <input class="mb-2 whitespace-nowrap w-full" type="text" ref={foodUnit} value={food.unit} />
                        <NumberInput
                            class={'whitespace-nowrap'}
                            label={'Portion'}
                            value={food.portion}
                            onChange={(portion: number) => (tmpFood.current.portion = portion)}
                        />
                    </div>
                ) : (
                    <div>
                        <span>{food.name}</span>
                        <span>
                            {' '}
                            {food.portion} {food.unit}{' '}
                        </span>
                    </div>
                )}

                {showUpdatePanel ? (
                    <div class="text-right pl-1">
                        <button class="w-full mb-2" onClick={onCancelClick}>
                            Cancel
                        </button>
                        <button class="w-full" onClick={onSaveClick}>
                            Save
                        </button>
                    </div>
                ) : (
                    <div>
                        <DropdownButton
                            actions={[
                                {label: 'Edit', onClick: onEditClicked},
                                {label: 'Delete', onClick: () => console.log('Delete')},
                            ]}
                        />
                    </div>
                )}
            </div>

            {showUpdatePanel ? (
                <div className="flex flex-wrap">
                    <NumberInput
                        class={'mx-1 whitespace-nowrap'}
                        label={'Carb'}
                        value={food.carb}
                        onChange={(carb: number) => (tmpFood.current.carb = carb)}
                    />
                    <NumberInput
                        class={'mx-1 whitespace-nowrap'}
                        label={'Protein'}
                        value={food.protein}
                        onChange={(protein: number) => (tmpFood.current.protein = protein)}
                    />
                    <NumberInput
                        class={'mx-1 whitespace-nowrap'}
                        label={'Fibre'}
                        value={food.fibre}
                        onChange={(fibre: number) => (tmpFood.current.fibre = fibre)}
                    />
                    <NumberInput
                        class={'mx-1 whitespace-nowrap'}
                        label={'Fat'}
                        value={food.fat}
                        onChange={(fat: number) => (tmpFood.current.fat = fat)}
                    />
                </div>
            ) : (
                <div className="flex flex-wrap">
                    <span class="mx-1 whitespace-nowrap">{food.carb.toFixed(3)} Carb </span>
                    <span class="mx-1 whitespace-nowrap">{food.protein.toFixed(3)} Protein </span>
                    <span class="mx-1 whitespace-nowrap">{food.fibre.toFixed(3)} Fibre </span>
                    <span class="mx-1 whitespace-nowrap">{food.fat.toFixed(3)} Fat </span>
                </div>
            )}
        </div>
    );
}
