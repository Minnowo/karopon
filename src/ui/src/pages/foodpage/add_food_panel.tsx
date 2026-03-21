import {useState, useMemo, useRef, useEffect} from 'preact/hooks';
import {TblDataSource, TblDataSourceFood, TblUserFood} from '../../api/types';
import {ErrorDiv} from '../../components/error_div';
import {DoRender} from '../../hooks/doRender';
import {NumberInput} from '../../components/number_input';
import { FoodSearchPanel } from './food_search_panel';

type AddFoodPanelProps = {
    food: TblUserFood;
    addFood: (food: TblUserFood) => void;
    onCancel: ()=>void;
    dataSources: TblDataSource[] | null;
    className?: string;
    readonly doRefresh: () => void;
};
export function AddFoodPanel({food, dataSources, addFood, onCancel, className, doRefresh}: AddFoodPanelProps) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const foodRef = useRef<HTMLInputElement>(null);
    const tmpFood = useMemo<TblUserFood>(() => ({...food}), [food]);
    const render = DoRender();

    useEffect(() => {
        foodRef.current?.focus();
    }, []);

    const onSaveClick = () => {
        setErrorMsg(null);

        const newFood = {...food, ...tmpFood};
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

        addFood(newFood);
    };

    const onChooseFood = (chosenFood: TblDataSourceFood) => {
        tmpFood.name = chosenFood.name;
        tmpFood.unit = chosenFood.unit;
        tmpFood.portion = chosenFood.portion;
        tmpFood.fat = chosenFood.fat;
        tmpFood.carb = chosenFood.carb;
        tmpFood.fibre = chosenFood.fibre;
        tmpFood.protein = chosenFood.protein;
        foodRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
        render();
    };

    return (
        <div className={`rounded-sm p-2 border container-theme ${className}`}>
            <div className="w-full mb-4">
                <details className="w-full no-summary-arrow">
                    <summary className="cursor-pointer text-lg font-bold">
                        Create New Food
                        <span className="text-xs"> (click for help)</span>
                    </summary>

                    <div className="text-sm p-4">
                        <p>Add a food using information from a nutrition label or a built-in data source.</p>

                        <br />

                        <p className="font-semibold">From a food label</p>

                        <ol className="list-decimal list-inside space-y-1">
                            <li>Find the nutrition label on the package.</li>

                            <li>
                                Choose a unit and portion size that match the label.
                                <div className="ml-4 mt-1">
                                    You can choose any unit, as long as the portion of that unit represents the same portion as
                                    the label.
                                </div>
                                <div className="ml-4 mt-1">
                                    Example: <span className="font-semibold">1 bar (45 g)</span>
                                </div>
                                <ol className="list-disc list-inside space-y-1 ml-4 mt-1">
                                    <li>
                                        Track in grams:
                                        <span className="ml-1">
                                            Unit <span className="font-semibold">g</span>, Portion{' '}
                                            <span className="font-semibold">45</span>
                                        </span>
                                    </li>
                                    <li>
                                        Track by kilograms:
                                        <span className="ml-1">
                                            Unit <span className="font-semibold">kg</span>, Portion{' '}
                                            <span className="font-semibold">0.045</span>
                                        </span>
                                    </li>
                                    <li>
                                        Track by item:
                                        <span className="ml-1">
                                            Unit <span className="font-semibold">bars</span>, Portion{' '}
                                            <span className="font-semibold">1</span>
                                        </span>
                                    </li>
                                </ol>
                            </li>

                            <li>Enter the nutrition values (Fat, Carbs, Fibre, Protein) as shown on the label.</li>

                            <li>Create the food.</li>
                        </ol>

                        <br />
                        <p className="font-semibold">From a built-in data source</p>

                        <ol className="list-decimal list-inside space-y-1">
                            <li>
                                Expand the <span className="font-semibold">Search data sources for food</span> section below.
                            </li>
                            <li>Select the data source you want to search.</li>
                            <li>Search for the food you want to add.</li>
                            <li>Review the search results and select the food you want.</li>
                            <li>
                                Click <span className="font-semibold">Choose</span> to copy the food’s information.
                            </li>
                            <li>Make any final adjustments to the food details.</li>
                            <li>Create the food.</li>
                        </ol>
                    </div>
                </details>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            <div className="flex flex-col font-semibold gap-2">
                    <div className="flex flex-row flex-wrap gap-2">
                        <input
                            ref={foodRef}
                            className="flex-auto"
                            type="text"
                            value={tmpFood.name}
                            onInput={(e) => (tmpFood.name = e.currentTarget.value)}
                            placeholder="Food Name"
                        />
                        <input
                            className="flex-auto max-w-32"
                            type="text"
                            value={tmpFood.unit}
                            onInput={(e) => (tmpFood.unit = e.currentTarget.value)}
                            placeholder="Portion Unit"
                        />
                    </div>
                    <NumberInput
                        className='w-full'
                        innerClassName='w-full'
                        min={0}
                        label={'Portion'}
                        value={tmpFood.portion}
                        onValueChange={(portion: number) => {
                            tmpFood.portion = portion;
                            render();
                        }}
                    />
            </div>

            <div className="flex flex-wrap flex-col sm:flex-row justify-evenly gap-x-2 gap-y-2 my-2">
                <NumberInput
                    className="flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Fat'}
                    min={0}
                    precision={4}
                    value={tmpFood.fat}
                    onValueChange={(fat: number) => {
                        tmpFood.fat = fat;
                        render();
                    }}
                />
                <NumberInput
                    className="flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Carb'}
                    min={0}
                    precision={4}
                    value={tmpFood.carb}
                    onValueChange={(carb: number) => {
                        tmpFood.carb = carb;
                        render();
                    }}
                />
                <NumberInput
                    className="flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Fibre'}
                    min={0}
                    precision={4}
                    value={tmpFood.fibre}
                    onValueChange={(fibre: number) => {
                        tmpFood.fibre = fibre;
                        render();
                    }}
                />
                <NumberInput
                    className="flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Protein'}
                    min={0}
                    precision={4}
                    value={tmpFood.protein}
                    onValueChange={(protein: number) => {
                        tmpFood.protein = protein;
                        render();
                    }}
                />
            </div>
            <div className="flex justify-end gap-2">
                <button className="cancel-btn" onClick={onCancel}>
                    Cancel
                </button>
                <button className="save-btn" onClick={onSaveClick}>
                    Create Food
                </button>
            </div>

            <details className="w-full">
                <summary className="cursor-pointer text-sm font-semibold">Search data sources for food</summary>

                <div class="w-full p-2">
                    {dataSources !== null && dataSources.length > 0 ? (
                        <FoodSearchPanel dataSources={dataSources} doRefresh={doRefresh} onChooseFood={onChooseFood} />
                    ) : (
                        'The server does not have any 3rd party data sources to search food.'
                    )}
                </div>
            </details>
        </div>
    );
}
