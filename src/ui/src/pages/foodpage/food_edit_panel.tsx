import {useState, useRef} from 'preact/hooks';
import {TblUserFood} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {DropdownButton} from '../../components/drop_down_button';
import {JSX} from 'preact/jsx-runtime';

type FoodEditPanelProps = {
    food: TblUserFood;
    updateFood: (_food: TblUserFood) => void;
    deleteFood?: (food: TblUserFood) => void;
    copyFood?: (food: TblUserFood) => void;
};

export function FoodEditPanel({food, updateFood, copyFood, deleteFood}: FoodEditPanelProps) {
    const tmpFood = useRef<TblUserFood>({} as TblUserFood);
    const foodName = useRef<HTMLInputElement>(null);
    const foodUnit = useRef<HTMLInputElement>(null);
    const [showUpdatePanel, setShowUpdatePanel] = useState<boolean>(false);
    const [portion, setPortion] = useState<number>(food.portion);

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

    const updatePortion = (e: JSX.TargetedEvent<HTMLInputElement, Event>) => {
        const raw = e.currentTarget.value;

        const num = raw === '' ? null : Number(raw);

        if (num !== null) {
            setPortion(num);
        }
    };

    return (
        <div key={food.id} className="rounded-sm p-2 border container-theme">
            <div className="flex justify-between font-semibold">
                {showUpdatePanel ? (
                    <>
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

                        <div class="text-right pl-1">
                            <button class="w-full mb-2" onClick={onCancelClick}>
                                Cancel
                            </button>
                            <button class="w-full" onClick={onSaveClick}>
                                Save
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="w-full flex flex-col">
                        <span className="w-full text-lg mb-2">{food.name}</span>
                        <div className="w-full flex flex-row items-center justify-between">
                            <span>
                                Per
                                <input className="mx-2 w-32" type="number" value={portion} onInput={updatePortion} min="0" />
                                <strong>{food.unit}</strong>
                            </span>
                            <DropdownButton
                                actions={[
                                    {
                                        label: 'Copy',
                                        onClick: () => {
                                            if (copyFood)
                                                copyFood({
                                                    id: food.id,
                                                    user_id: food.user_id,
                                                    name: food.name,
                                                    unit: food.unit,
                                                    fat: food.fat * portion,
                                                    carb: food.carb * portion,
                                                    fibre: food.fibre * portion,
                                                    protein: food.protein * portion,
                                                    portion,
                                                });
                                        },
                                    },
                                    {label: 'Edit', onClick: onEditClicked},
                                    {
                                        label: 'Delete',
                                        onClick: () => {
                                            if (deleteFood) deleteFood(food);
                                        },
                                    },
                                ]}
                            />
                        </div>
                    </div>
                )}
            </div>

            {showUpdatePanel ? (
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
            ) : (
                <>
                    <div class="w-full">
                        <div class="flex flex-col gap-2 sm:hidden">
                            <div class="flex justify-between">
                                <span>Protein</span>
                                <span>{(food.protein * portion).toFixed(3)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Carbs</span>
                                <span>{(food.carb * portion).toFixed(3)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Fibre</span>
                                <span>{(food.fibre * portion).toFixed(3)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Fat</span>
                                <span>{(food.fat * portion).toFixed(3)}</span>
                            </div>
                        </div>

                        <div class="hidden sm:flex flex-col gap-1 w-full">
                            <div class="flex text-xs font-semibold w-full">
                                <div class="flex-1">Protein</div>
                                <div class="flex-1">Carbs</div>
                                <div class="flex-1">Fibre</div>
                                <div class="flex-1">Fat</div>
                            </div>

                            <div class="flex text-sm font-medium w-full">
                                <div class="flex-1">{(food.protein * portion).toFixed(3)}</div>
                                <div class="flex-1">{(food.carb * portion).toFixed(3)}</div>
                                <div class="flex-1">{(food.fibre * portion).toFixed(3)}</div>
                                <div class="flex-1">{(food.fat * portion).toFixed(3)}</div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
