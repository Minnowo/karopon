import {useState, useRef, useEffect, useMemo} from 'preact/hooks';
import {TblUser, TblUserEvent, TblUserFood, TblUserFoodLog, TblUserFoodLogWithKey} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {ErrorDiv} from '../../components/error_div';
import {DoRender} from '../../hooks/doRender';
import {TblUserFoodLogFactory} from '../../api/factories';
import {AddFoodlogPanelRow} from '../../components/add_foodlog_row';
import {AddFoodPanel} from './add_food_panel';

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

    const netCarb = totals.carb - totals.fibre;

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
        <div className={`rounded-sm p-2 border container-theme bg-c-black ${p.className}`}>
            <div className="flex w-full justify-between">
                <span className="text-lg font-bold">Food Builder</span>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            <div className="overflow-x-scroll">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="font-semibold text-xs border-b">
                            <th className="text-left py-1">
                                <button
                                    onClick={() => {
                                        foods.push(mutateWithKey(TblUserFoodLogFactory.empty()));
                                        render();
                                    }}
                                >
                                    Add Row
                                </button>
                            </th>
                            <th className="text-center py-1">Unit</th>
                            <th className="text-center py-1">Amount</th>
                            <th className="text-center py-1">Protein</th>
                            <th className="text-center py-1">Carbs</th>
                            <th className="text-center py-1">Fibre</th>
                            <th className="text-center py-1">Fat</th>
                            <th className="text-center py-1">NetCarb</th>
                            <th className="text-center py-1" />
                        </tr>
                    </thead>

                    <tbody>
                        {foods.map((f: TblUserFoodLogWithKey, index: number) => {
                            return (
                                <AddFoodlogPanelRow
                                    key={f.key}
                                    foods={p.foods}
                                    food={f}
                                    render={render}
                                    deleteSelf={() => {
                                        foods.splice(index, 1);
                                        render();
                                    }}
                                />
                            );
                        })}
                        <tr>
                            <td className="whitespace-nowrap w-full pr-1">
                                <input
                                    className="w-full min-w-8"
                                    type="text"
                                    value={food.current.name}
                                    onInput={(e) => (food.current.name = e.currentTarget.value)}
                                    placeholder="Your built food name"
                                />
                            </td>
                            <td className="text-center pr-1">
                                <input
                                    className="whitespace-nowrap flex-auto max-w-32"
                                    type="text"
                                    value={food.current.unit}
                                    onInput={(e) => (food.current.unit = e.currentTarget.value)}
                                    placeholder="Portion Unit"
                                />
                            </td>
                            <td className="text-center pr-1">
                                <NumberInput
                                    className={'w-full'}
                                    innerClassName={'w-full'}
                                    min={0}
                                    max={1_000_000_000}
                                    value={food.current.portion}
                                    onValueChange={(portion: number) => {
                                        food.current.portion = portion;
                                        render();
                                    }}
                                />
                            </td>
                            <td className="text-center pr-1">{totals.protein.toFixed(1)}</td>
                            <td className="text-center pr-1">{totals.carb.toFixed(1)}</td>
                            <td className="text-center pr-1">{totals.fibre.toFixed(1)}</td>
                            <td className="text-center pr-1"> {totals.fat.toFixed(1)}</td>
                            <td className="text-center font-bold"> {netCarb.toFixed(1)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="w-full flex flex-wrap flex-col sm:flex-row sm:justify-evenly justify-end">
                <input
                    className="w-full my-1 sm:ml-1 sm:max-w-32 text-c-l-green"
                    type="submit"
                    value="Build Food"
                    onClick={onCreateClick}
                />
            </div>
        </div>
    );
}
