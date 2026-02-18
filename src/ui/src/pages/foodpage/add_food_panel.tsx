import {useState, useMemo, useRef, useEffect} from 'preact/hooks';
import {TblDataSource, TblDataSourceFood, TblUserFood} from '../../api/types';
import {ErrorDiv} from '../../components/error_div';
import {DoRender} from '../../hooks/doRender';
import {NumberInput} from '../../components/number_input';
import {ApiGetDataSourceFoods} from '../../api/api';
import {GetErrorHandler} from '../../utils/error';
import {Fragment} from 'preact/jsx-runtime';

type FoodSearchPanelProps = {
    readonly doRefresh: () => void;
    onChooseFood: (food: TblDataSourceFood) => void;
    dataSources: TblDataSource[];
};
export const FoodSearchPanel = (state: FoodSearchPanelProps) => {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [curRow, setCurRow] = useState<number>(-1);
    const [selectedDataSource, setSelectedDataSource] = useState<number | null>(
        state.dataSources.length > 0 ? state.dataSources[0].id : null
    );
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<TblDataSourceFood[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!selectedDataSource || !searchText.trim()) {
            return;
        }
        setLoading(true);
        try {
            const foods = await ApiGetDataSourceFoods(selectedDataSource, searchText.trim());
            setResults(foods);
        } catch (err) {
            GetErrorHandler(setErrorMsg, state.doRefresh)(err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="flex flex-col">
            <ErrorDiv errorMsg={errorMsg} />

            <select
                className="border rounded mb-2"
                value={selectedDataSource ?? ''}
                onChange={(e) => setSelectedDataSource(Number(e.currentTarget.value))}
            >
                <option value="" disabled>
                    Select a datasource
                </option>
                {state.dataSources.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                        {ds.name}
                    </option>
                ))}
            </select>

            <div className="flex flex-row items-center mb-2">
                <input
                    type="text"
                    value={searchText}
                    onInput={(e: Event) => setSearchText((e.target as HTMLInputElement).value)}
                    onKeyPress={handleKeyPress}
                    className="w-full mr-1"
                    placeholder="Type food name..."
                />

                <button
                    type="button"
                    onClick={handleSearch}
                    className="ml-1 max-w-32 w-full"
                    disabled={!selectedDataSource || !searchText.trim() || loading}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {results.length > 0 ? (
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-xs font-semibold">
                            <th className=" text-left py-1" title="Food Name">
                                {' '}
                                Name{' '}
                            </th>
                            <th className=" text-right py-1 pr-2" title="Amount">
                                Amt
                            </th>
                            <th className=" text-right py-1 pr-2" title="Fat">
                                Fat
                            </th>
                            <th className=" text-right py-1 pr-2" title="Carbs">
                                Carb
                            </th>
                            <th className=" text-right py-1 pr-2" title="Fibre">
                                Fib
                            </th>
                            <th className=" text-right py-1 pr-2" title="Protein">
                                Prot
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {results.map((food: TblDataSourceFood, i: number) => {
                            const shown = i === curRow;
                            const toggle = () => setCurRow(shown ? -1 : i);
                            const rowColor = i % 2 === 0 ? 'bg-c-surface0' : 'bg-c-surface1';

                            return (
                                <Fragment key={food.id}>
                                    {shown && (
                                        <tr className={`cursor-pointer ${rowColor}`} onClick={toggle}>
                                            <td className="border-c-pink border-t-2 " colSpan={7}>
                                                <div className="mx-1">{food.name}</div>
                                            </td>
                                        </tr>
                                    )}
                                    <tr onClick={toggle} className={`cursor-pointer ${rowColor}`}>
                                        <td className={`whitespace-nowrap max-w-[100px] sm:w-full pr-2`}>
                                            {!shown ? (
                                                <div className="overflow-x-hidden">{food.name}</div>
                                            ) : (
                                                <div className="w-full">&nbsp;</div>
                                            )}
                                        </td>
                                        <td className="text-right whitespace-nowrap pr-2">
                                            {food.portion} {food.unit}
                                        </td>
                                        <td className="text-right pr-2">{food.fat.toFixed(1)}</td>
                                        <td className="text-right pr-2">{food.carb.toFixed(1)}</td>
                                        <td className="text-right pr-2">{food.fibre.toFixed(1)}</td>
                                        <td className="text-right pr-2">{food.protein.toFixed(1)}</td>
                                    </tr>
                                    {shown && (
                                        <tr className={`${rowColor}`}>
                                            <td colSpan={7}>
                                                <div className="flex flex-row py-2 justify-between px-1">
                                                    <div className="flex flex-col">
                                                        <span>ID {food.data_source_row_int_id}</span>
                                                    </div>
                                                    <button
                                                        className="bg-c-green max-w-32 w-full"
                                                        onClick={() => state.onChooseFood(food)}
                                                    >
                                                        Choose
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <p className="text-c-magenta mt-2">No results found.</p>
            )}
        </div>
    );
};

type AddFoodPanelProps = {
    food: TblUserFood;
    addFood: (food: TblUserFood) => void;
    dataSources: TblDataSource[] | null;
    className?: string;
    readonly doRefresh: () => void;
};
export function AddFoodPanel({food, dataSources, addFood, className, doRefresh}: AddFoodPanelProps) {
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
            <div className="flex justify-between font-semibold">
                <div className="w-full">
                    <div className="flex flex-row flex-wrap">
                        <input
                            ref={foodRef}
                            className="mb-2 whitespace-nowrap flex-auto mr-1"
                            type="text"
                            value={tmpFood.name}
                            onInput={(e) => (tmpFood.name = e.currentTarget.value)}
                            placeholder="Food Name"
                        />
                        <input
                            className="mb-2 whitespace-nowrap flex-auto max-w-32"
                            type="text"
                            value={tmpFood.unit}
                            onInput={(e) => (tmpFood.unit = e.currentTarget.value)}
                            placeholder="Portion Unit"
                        />
                    </div>
                    <NumberInput
                        className={'w-full mb-1'}
                        innerClassName={'w-full'}
                        min={0}
                        label={'Portion'}
                        value={tmpFood.portion}
                        onValueChange={(portion: number) => {
                            tmpFood.portion = portion;
                            render();
                        }}
                    />
                </div>
            </div>

            <div className="w-full flex flex-wrap flex-col sm:flex-row sm:justify-evenly justify-end">
                <NumberInput
                    className="my-1 sm:mr-1 flex-1 flex-grow"
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
                    className="my-1 sm:mx-1 flex-1 flex-grow"
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
                    className="my-1 sm:mx-1 flex-1 flex-grow"
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
                    className="my-1 sm:mx-1 flex-1 flex-grow"
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
                <button className="ml-auto my-1 sm:ml-1 bg-c-green font-bold w-full max-w-32" onClick={onSaveClick}>
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
