import {useState, useRef} from 'preact/hooks';
import {TblUserFood} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import {JSX} from 'preact/jsx-runtime';
import {NumberInput} from '../../components/number_input';

type FoodEditPanelProps = {
    food: TblUserFood;
    updateFood: (_food: TblUserFood) => void;
    deleteFood?: (food: TblUserFood) => void;
    copyFood?: (food: TblUserFood) => void;
};

export function FoodEditPanel({food, updateFood, copyFood, deleteFood}: FoodEditPanelProps) {
    const tmpFood = useRef<TblUserFood>({...food});
    const foodName = useRef<HTMLInputElement>(null);
    const foodUnit = useRef<HTMLInputElement>(null);
    const [showUpdatePanel, setShowUpdatePanel] = useState<boolean>(false);
    const [portion, setPortion] = useState<number>(food.portion);

    const [, setRender] = useState<number>(0);

    const render = () => setRender((x) => x + 1);

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
                                className={'whitespace-nowrap'}
                                label={'Portion'}
                                value={tmpFood.current.portion}
                                onValueChange={(portion: number) => {
                                    tmpFood.current.portion = portion;
                                    render();
                                }}
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
                        <div className="w-full flex flex-row items-center justify-between mb-2">
                            <NumberInput
                                innerClassName="w-24"
                                label={food.unit}
                                numberList={[1, 5, 10, 20, 30, 50, 100, portion + 100, portion * 2, portion * 4, portion * 10]}
                                distinctNumberList={true}
                                min={0}
                                max={1_000_000_000}
                                value={portion}
                                onValueChange={setPortion}
                            />
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
                        className={'mx-1 mt-2 whitespace-nowrap'}
                        label={'Protein'}
                        value={tmpFood.current.protein}
                        onValueChange={(protein: number) => {
                            tmpFood.current.protein = protein;
                            render();
                        }}
                    />
                    <NumberInput
                        className={'mx-1 mt-2 whitespace-nowrap'}
                        label={'Carb'}
                        value={tmpFood.current.carb}
                        onValueChange={(carb: number) => {
                            tmpFood.current.carb = carb;
                            render();
                        }}
                    />
                    <NumberInput
                        className={'mx-1 mt-2 whitespace-nowrap'}
                        label={'Fibre'}
                        value={tmpFood.current.fibre}
                        onValueChange={(fibre: number) => {
                            tmpFood.current.fibre = fibre;
                            render();
                        }}
                    />
                    <NumberInput
                        className={'mx-1 mt-2 whitespace-nowrap'}
                        label={'Fat'}
                        value={tmpFood.current.fat}
                        onValueChange={(fat: number) => {
                            tmpFood.current.fat = fat;
                            render();
                        }}
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
