import {useState, useRef, useMemo} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserFoodLog, TblUserFoodLogWithKey} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {ErrorDiv} from '../../components/error_div';
import {DoRender} from '../../hooks/doRender';
import {TblUserFoodLogFactory} from '../../api/factories';
import {AddFoodlogPanelRow} from '../../components/add_foodlog_row';

type FoodBuilderPanelProps = {
    user: TblUser;
    foods: TblUserFood[];
    addFood: (food: TblUserFood) => void;
    className?: string;
};

export function FoodBuilderPanel(p: FoodBuilderPanelProps) {
    // Used for the foods array key={} when rendering the food list.
    // The foods array is a ref which is passed into the row component, where it is edited by ref.
    // This ensures that each row in the array has a unique key for proper re-render.
    const keyRef = useRef<number>(-1);

    const mutateWithKey = (l: TblUserFoodLog): TblUserFoodLogWithKey => {
        (l as TblUserFoodLogWithKey).key = --keyRef.current;
        return l as TblUserFoodLogWithKey;
    };

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const food = useRef<TblUserFood>({
        id: 0,
        user_id: 0,
        name: '',
        unit: '',
        portion: 0,
        protein: 0,
        carb: 0,
        fibre: 0,
        fat: 0,
    });
    const foods = useMemo<TblUserFoodLogWithKey[]>(
        () => [
            mutateWithKey(TblUserFoodLogFactory.empty()),
            mutateWithKey(TblUserFoodLogFactory.empty()),
            mutateWithKey(TblUserFoodLogFactory.empty()),
        ],
        [
            /* never changes */
        ]
    );
    const render = DoRender();

    const totals = (() => {
        const cols = [0, 0, 0, 0];
        for (let i = 0; i < foods.length; i++) {
            if (foods[i].portion !== 0 && foods[i].name !== '') {
                cols[0] += foods[i].protein;
                cols[1] += foods[i].carb;
                cols[2] += foods[i].fibre;
                cols[3] += foods[i].fat;
            }
        }
        return {
            protein: cols[0],
            carb: cols[1],
            fibre: cols[2],
            fat: cols[3],
        };
    })();

    const onCreateClick = () => {
        setErrorMsg(null);

        if (food.current.name.trim() === '') {
            setErrorMsg('Food cannot have empty name');
            return;
        }

        if (food.current.unit.trim() === '') {
            setErrorMsg('Food unit cannot be empty');
            return;
        }

        if (food.current.portion <= 0) {
            setErrorMsg('Food portion must be a positive number');
            return;
        }

        const newFood: TblUserFood = {
            ...food.current,
            protein: totals.protein,
            carb: totals.carb,
            fibre: totals.fibre,
            fat: totals.fat,
        };

        p.addFood(newFood);
    };

    return (
        <div className={`rounded-sm p-2 border container-theme ${p.className}`}>
            <div className="w-full">
                <details className="w-full no-summary-arrow">
                    <summary className="cursor-pointer text-lg font-bold">
                        Food Builder
                        <span className="text-xs"> (click for help)</span>
                    </summary>

                    <div className="text-sm p-4">
                        <p>Combine existing foods to create a new food. Best for home cooking and recipes.</p>

                        <br />

                        <p className="font-semibold">Example: home cooking</p>

                        <ol className="list-decimal list-inside space-y-1">
                            <li>Add each ingredient as its own food.</li>
                            <li>Enter the amount of each ingredient in the table below.</li>
                            <li>Cook the food.</li>
                            <li>
                                Weigh the final result
                                <span className="font-semibold"> (important!)</span> — this should be the total cooked weight of
                                everything.
                            </li>
                            <li>Give the food a name, then enter the final weight and unit of measure.</li>
                            <li>Build the food.</li>
                        </ol>

                        <br />

                        <p className="font-semibold">Example: baking 3-ingredient cookies</p>

                        <ol className="list-decimal list-inside space-y-1">
                            <li>
                                Add these ingredients as separate foods:
                                <ul className="list-disc list-inside ml-4">
                                    <li>Peanut butter</li>
                                    <li>Sugar</li>
                                    <li>Eggs</li>
                                </ul>
                            </li>
                            <li>
                                Enter the portions for each ingredient in the table (e.g., 1 cup peanut butter, ½ cup sugar, 1
                                egg).
                            </li>
                            <li>Mix and bake your cookies.</li>
                            <li>Weigh the total batch after baking.</li>
                            <li>
                                Name your food (e.g., "Peanut Butter Cookies") and enter the final weight and unit (e.g., 12
                                cookies / 300g).
                            </li>
                            <li>Build the food to save it.</li>
                        </ol>
                    </div>
                </details>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            <div className="overflow-x-scroll mt-4">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="font-semibold text-xs text-center">
                            <th className="text-left py-1">
                                <button
                                    className="w-full sm:w-32"
                                    onClick={() => {
                                        foods.push(mutateWithKey(TblUserFoodLogFactory.empty()));
                                        render();
                                    }}
                                >
                                    Add Row
                                </button>
                            </th>
                            <th className="py-1">Unit</th>
                            <th className="py-1">Amt</th>
                            <th className="py-1">Fat</th>
                            <th className="py-1">Carb</th>
                            <th className="py-1">Fib</th>
                            <th className="py-1">Prot</th>
                            <th className="py-1" />
                        </tr>
                    </thead>

                    <tbody>
                        {foods.map((f: TblUserFoodLogWithKey, index: number) => {
                            return (
                                <AddFoodlogPanelRow
                                    key={f.key}
                                    user={p.user}
                                    foods={p.foods}
                                    food={f}
                                    render={render}
                                    deleteSelf={() => {
                                        foods.splice(index, 1);
                                        render();
                                    }}
                                    showNetCarb={false}
                                    showCalories={false}
                                />
                            );
                        })}
                        <tr>
                            {' '}
                            <td>&nbsp;</td>{' '}
                        </tr>
                    </tbody>
                </table>
            </div>

            <table className="w-full text-center">
                <thead>
                    <th>Fat</th>
                    <th className="px-1">Carb</th>
                    <th className="px-1">Fib</th>
                    <th>Prot</th>
                </thead>
                <tbody>
                    <tr>
                        <td> {totals.fat.toFixed(1)}</td>
                        <td className="px-1">{totals.carb.toFixed(1)}</td>
                        <td className="px-1">{totals.fibre.toFixed(1)}</td>
                        <td>{totals.protein.toFixed(1)}</td>
                    </tr>
                </tbody>
            </table>

            <div className="w-full mt-4">
                <div className="flex flex-row flex-wrap">
                    <input
                        className="mb-2 flex-auto mr-1"
                        type="text"
                        value={food.current.name}
                        onInput={(e) => (food.current.name = e.currentTarget.value)}
                        placeholder="Food Name"
                    />
                    <input
                        className="mb-2 flex-auto max-w-32"
                        type="text"
                        value={food.current.unit}
                        onInput={(e) => (food.current.unit = e.currentTarget.value)}
                        placeholder="Portion Unit"
                    />
                </div>
                <NumberInput
                    className={'w-full mb-1'}
                    innerClassName={'w-full'}
                    min={0}
                    label={'Portion'}
                    value={food.current.portion}
                    onValueChange={(portion: number) => {
                        food.current.portion = portion;
                        render();
                    }}
                />
            </div>

            <div className="w-full flex flex-wrap flex-col sm:flex-row sm:justify-evenly justify-end">
                <input
                    className="w-full my-1 sm:ml-1 sm:max-w-32 bg-c-green font-bold"
                    type="submit"
                    value="Build Food"
                    onClick={onCreateClick}
                />
            </div>
        </div>
    );
}
