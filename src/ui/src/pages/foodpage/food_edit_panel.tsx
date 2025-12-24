import {useState, useRef} from 'preact/hooks';
import {TblUser, TblUserFood} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import {DoRender} from '../../hooks/doRender';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';
import {ErrorDiv} from '../../components/error_div';
import {NumberInput} from '../../components/number_input';

type FoodEditPanelProps = {
    user: TblUser;
    food: TblUserFood;
    updateFood: (_food: TblUserFood) => void;
    deleteFood?: (food: TblUserFood) => void;
    copyFood?: (food: TblUserFood) => void;
};

export function FoodEditPanel({user, food, updateFood, copyFood, deleteFood}: FoodEditPanelProps) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showUpdatePanel, setShowUpdatePanel] = useState<boolean>(false);
    const [portion, setPortion] = useState<number>(food.portion);
    const tmpFood = useRef<TblUserFood>({...food});

    const render = DoRender();

    const onEditClicked = () => {
        tmpFood.current = {
            id: food.id,
            user_id: food.user_id,
            name: food.name,
            unit: food.unit,
            fat: food.fat * portion,
            carb: food.carb * portion,
            fibre: food.fibre * portion,
            protein: food.protein * portion,
            portion,
        };
        setShowUpdatePanel(true);
    };

    const onCancelClick = () => {
        setShowUpdatePanel(false);
        setErrorMsg(null);
    };

    const onSaveClick = () => {
        const newFood = {...food, ...tmpFood.current};

        newFood.name = newFood.name.trim();
        newFood.unit = newFood.unit.trim();

        if (newFood.name === '') {
            setErrorMsg('Food cannot have empty name');
            return;
        }

        if (newFood.unit === '') {
            setErrorMsg('Food unit cannot be empty');
            return;
        }

        if (newFood.portion <= 0) {
            setErrorMsg('Food portion must be a positive number');
            return;
        }

        updateFood(newFood);
        setShowUpdatePanel(false);
        setErrorMsg(null);
    };

    return (
        <div key={food.id} className="rounded-sm p-2 border container-theme">
            <ErrorDiv errorMsg={errorMsg} />
            <div className="flex justify-between font-semibold">
                {showUpdatePanel ? (
                    <>
                        <div class="w-full px-1">
                            <input
                                class="mb-2 whitespace-nowrap w-full"
                                type="text"
                                onInput={(e) => (tmpFood.current.name = e.currentTarget.value)}
                                value={tmpFood.current.name}
                                placeholder="Food Name"
                            />
                            <input
                                class="mb-2 whitespace-nowrap w-full"
                                type="text"
                                onInput={(e) => (tmpFood.current.unit = e.currentTarget.value)}
                                value={tmpFood.current.unit}
                                placeholder="Portion Unit"
                            />
                            <NumberInput
                                className={'whitespace-nowrap'}
                                label={'Portion'}
                                value={tmpFood.current.portion}
                                onValueChange={(p: number) => {
                                    tmpFood.current.portion = p;
                                    render();
                                }}
                            />
                        </div>

                        <div class="text-right pl-1">
                            <button class="w-full mb-2 bg-c-l-red" onClick={onCancelClick}>
                                Cancel
                            </button>
                            <button class="w-full bg-c-green" onClick={onSaveClick}>
                                Save
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="w-full flex flex-col">
                        <div className="w-full flex flex-row">
                            <span className="w-full text-lg mb-2">{food.name}</span>
                            <DropdownButton
                                actions={[
                                    {
                                        label: 'Copy',
                                        onClick: () => {
                                            if (copyFood) {
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
                                            }
                                        },
                                    },
                                    {label: 'Edit', onClick: onEditClicked},
                                    {
                                        label: 'Delete',

                                        dangerous: true,
                                        onClick: () => {
                                            if (deleteFood) {
                                                deleteFood(food);
                                            }
                                        },
                                    },
                                ]}
                            />
                        </div>
                        <div className="w-full flex flex-row items-center justify-between mb-2">
                            <NumberInput
                                innerClassName="w-24"
                                label={food.unit}
                                min={0}
                                value={portion}
                                onValueChange={setPortion}
                            />
                            <span>
                                {`Calories ${CalculateCalories(
                                    food.protein * portion,
                                    (food.carb - food.fibre) * portion,
                                    food.fibre * portion,
                                    food.fat * portion,
                                    Str2CalorieFormula(user.caloric_calc_method)
                                ).toFixed(1)}`}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {showUpdatePanel ? (
                <div className="flex flex-wrap">
                    <NumberInput
                        className={'mx-1 mt-2 whitespace-nowrap'}
                        innerClassName="w-16"
                        label={'Fat'}
                        value={tmpFood.current.fat}
                        precision={3}
                        onValueChange={(fat: number) => {
                            tmpFood.current.fat = fat;
                            render();
                        }}
                    />
                    <NumberInput
                        className={'mx-1 mt-2 whitespace-nowrap'}
                        innerClassName="w-16"
                        label={'Carb'}
                        value={tmpFood.current.carb}
                        precision={3}
                        onValueChange={(carb: number) => {
                            tmpFood.current.carb = carb;
                            render();
                        }}
                    />
                    <NumberInput
                        className={'mx-1 mt-2 whitespace-nowrap'}
                        innerClassName="w-16"
                        label={'Fibre'}
                        value={tmpFood.current.fibre}
                        precision={3}
                        onValueChange={(fibre: number) => {
                            tmpFood.current.fibre = fibre;
                            render();
                        }}
                    />
                    <NumberInput
                        className={'mx-1 mt-2 whitespace-nowrap'}
                        innerClassName="w-16"
                        label={'Protein'}
                        value={tmpFood.current.protein}
                        precision={3}
                        onValueChange={(protein: number) => {
                            tmpFood.current.protein = protein;
                            render();
                        }}
                    />
                </div>
            ) : (
                <>
                    <div class="w-full">
                        <div class="flex flex-col gap-2 sm:hidden">
                            <div class="flex justify-between">
                                <span>Fat</span>
                                <span>{(food.fat * portion).toFixed(3)}</span>
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
                                <span>Protein</span>
                                <span>{(food.protein * portion).toFixed(3)}</span>
                            </div>
                        </div>

                        <div class="hidden sm:flex flex-col gap-1 w-full">
                            <div class="flex text-xs font-semibold w-full">
                                <div class="flex-1">Fat</div>
                                <div class="flex-1">Carbs</div>
                                <div class="flex-1">Fibre</div>
                                <div class="flex-1">Protein</div>
                            </div>

                            <div class="flex text-sm font-medium w-full">
                                <div class="flex-1">{(food.fat * portion).toFixed(3)}</div>
                                <div class="flex-1">{(food.carb * portion).toFixed(3)}</div>
                                <div class="flex-1">{(food.fibre * portion).toFixed(3)}</div>
                                <div class="flex-1">{(food.protein * portion).toFixed(3)}</div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
