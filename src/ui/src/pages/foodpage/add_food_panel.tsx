import {useState, useMemo, useRef, useEffect} from 'preact/hooks';
import {TblDataSource, TblDataSourceFood, TblUserFood} from '../../api/types';
import {ErrorDiv} from '../../components/error_div';
import {DoRender} from '../../hooks/doRender';
import {NumberInput} from '../../components/number_input';
import {FoodSearchPanel} from './food_search_panel';

type AddFoodPanelProps = {
    food: TblUserFood;
    addFood: (food: TblUserFood) => void;
    onCancel: () => void;
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
        <div className={`surface-1 flex flex-col gap-4 ${className}`}>
            <div className="w-full">
                <details className="w-full no-summary-arrow">
                    <summary className="cursor-pointer">
                        <h2 className="inline">Create New Food</h2>
                        <small> (click for help)</small>
                    </summary>

                    <div className="flex flex-col gap-2 pt-2">
                        <p>Add a food using information from a nutrition label or a built-in data source.</p>

                        <h4>From a food label</h4>

                        <ol className="list-decimal list-inside space-y-1">
                            <li>Find the nutrition label on the package.</li>

                            <li>
                                Choose a unit and portion size that match the label.
                                <div className="ml-4 mt-1">
                                    You can choose any unit, as long as the portion of that unit represents the same portion as
                                    the label.
                                </div>
                                <div className="ml-4 mt-1">
                                    Example: <strong>1 bar (45 g)</strong>
                                </div>
                                <ol className="list-disc list-inside space-y-1 ml-4 mt-1">
                                    <li>
                                        Track in grams:
                                        <span className="ml-1">
                                            Unit <strong>g</strong>, Portion <strong>45</strong>
                                        </span>
                                    </li>
                                    <li>
                                        Track by kilograms:
                                        <span className="ml-1">
                                            Unit <strong>kg</strong>, Portion <strong>0.045</strong>
                                        </span>
                                    </li>
                                    <li>
                                        Track by item:
                                        <span className="ml-1">
                                            Unit <strong>bars</strong>, Portion <strong>1</strong>
                                        </span>
                                    </li>
                                </ol>
                            </li>

                            <li>Enter the nutrition values (Fat, Carbs, Fibre, Protein) as shown on the label.</li>

                            <li>Create the food.</li>
                        </ol>
                        <h4>From a built-in data source</h4>

                        <ol className="list-decimal list-inside space-y-1">
                            <li>
                                Expand the <strong>Search data sources for food</strong> section below.
                            </li>
                            <li>Select the data source you want to search.</li>
                            <li>Search for the food you want to add.</li>
                            <li>Review the search results and select the food you want.</li>
                            <li>
                                Click <strong>Choose</strong> to copy the food's information.
                            </li>
                            <li>Make any final adjustments to the food details.</li>
                            <li>Create the food.</li>
                        </ol>
                    </div>
                </details>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            <div className="flex flex-col gap-2">
                <div className="flex flex-row flex-wrap gap-2">
                    <input
                        ref={foodRef}
                        className="flex-auto"
                        type="text"
                        value={tmpFood.name}
                        onInput={(e) => (tmpFood.name = e.currentTarget.value)}
                        placeholder="Food Name"
                        aria-label="Food Name"
                    />
                    <input
                        className="flex-auto max-w-32"
                        type="text"
                        value={tmpFood.unit}
                        onInput={(e) => (tmpFood.unit = e.currentTarget.value)}
                        placeholder="Portion Unit"
                        aria-label="Portion Unit"
                    />
                </div>
                <NumberInput
                    className="w-full"
                    innerClassName="w-full"
                    min={0}
                    label={'Portion'}
                    value={tmpFood.portion}
                    onValueChange={(portion: number) => {
                        tmpFood.portion = portion;
                        render();
                    }}
                />
            </div>

            <div className="flex flex-wrap flex-col sm:flex-row justify-evenly gap-2">
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
                <button onClick={onCancel}>Cancel</button>
                <button className="btn-success" onClick={onSaveClick}>
                    Create Food
                </button>
            </div>

            <details className="w-full">
                <summary className="cursor-pointer">Search data sources for food</summary>

                <div class="w-full pt-2">
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
