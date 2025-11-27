import {useEffect, useRef, useState} from 'preact/hooks';
import {TblUserEvent, TblUserFood, TblUserFoodLog} from '../../api/types';
import {FuzzySearch} from '../../components/select_list';
import {ChangeEvent} from 'preact/compat';
import {DoRender} from '../../hooks/doRender';
import {NumberInput2} from '../../components/number_input2';
import {TblUserFoodLogFactory} from '../../api/factories';
import {CalcInsulin} from '../../utils/insulin';

interface AddEventsPanelRowState {
    food: TblUserFoodLog;
    foods: TblUserFood[];
    render: () => void;
    deleteSelf: () => void;
}

export function AddEventsPanelRow({foods, food, render, deleteSelf}: AddEventsPanelRowState) {
    // This only holds the base carb, fat, protein, fibre when the portion is 1.
    // We use this to scale by the portion, but still let the user type manually.
    const foodTemplate = useRef<TblUserFoodLog>({...food});

    useEffect(() => {
        foodTemplate.current = {...food};
    }, [food]);

    return (
        <>
            <tr key={foodTemplate.current.id}>
                <td className="whitespace-nowrap w-full pr-1">
                    <FuzzySearch<TblUserFood>
                        query={foodTemplate.current.name}
                        onQueryChange={(q) => {
                            foodTemplate.current.name = q;
                            render();
                        }}
                        data={foods}
                        searchKey={'name'}
                        className="w-full my-1 sm:mr-1"
                        placeholder="Event"
                        onSelect={(newFood: TblUserFood | null) => {
                            if (newFood) {
                                // Purposefully update the obj instead of assigning it.
                                // We want the caller's object to be modified by this.
                                food.id = newFood.id;
                                food.name = newFood.name;
                                food.unit = newFood.unit;
                                food.portion = 1;
                                food.protein = newFood.protein;
                                food.fat = newFood.fat;
                                food.fibre = newFood.fibre;
                                food.carb = newFood.carb;
                                foodTemplate.current = {...food};
                                render();
                            }
                        }}
                    />
                </td>
                <td className="flex flex-none justify-end pr-1">
                    <NumberInput2
                        label={food.unit}
                        value={food.portion}
                        onValueChange={(v) => {
                            food.portion = v;
                            food.carb = foodTemplate.current.carb * v;
                            food.protein = foodTemplate.current.protein * v;
                            food.fat = foodTemplate.current.fat * v;
                            food.fibre = foodTemplate.current.fibre * v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput2
                        value={food.protein}
                        onValueChange={(v) => {
                            food.protein = v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput2
                        value={food.carb}
                        onValueChange={(v) => {
                            food.carb = v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput2
                        value={food.fibre}
                        onValueChange={(v) => {
                            food.fibre = v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput2
                        value={food.fat}
                        onValueChange={(v) => {
                            food.fat = v;
                            render();
                        }}
                    />
                </td>
                <td>
                    <button className="bg-c-l-red hover:bg-c-red px-1" onClick={() => deleteSelf()}>
                        X
                    </button>
                </td>
            </tr>
        </>
    );
}

interface AddEventsPanelState {
    foods: TblUserFood[];
    events: TblUserEvent[];
}

export function AddEventsPanel(p: AddEventsPanelState) {
    const [event, setEvent] = useState<string>('');
    const [eventTime, setEventTime] = useState<Date>(new Date());
    const [bloodSugar, setBloodSugar] = useState<number>(0);
    const [insulinTaken, setInsulinTaken] = useState<number>(0);
    const foods = useRef<TblUserFoodLog[]>([
        TblUserFoodLogFactory.empty(),
        TblUserFoodLogFactory.empty(),
        TblUserFoodLogFactory.empty(),
    ]);

    const render = DoRender();

    const onEventTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target) {
            const value = e.currentTarget.value;
            setEventTime(new Date(value));
        }
    };

    const calcNetCarbs = () => {
        let net = 0;
        for (let i = 0; i < foods.current.length; i++) {
            net += foods.current[i].carb - foods.current[i].fibre;
        }
        return net;
    };

    const buildSumHeader = () => {
        if (foods.current.length <= 1) {
            return <> </>;
        }

        const cols = [0, 0, 0, 0];
        for (let i = 0; i < foods.current.length; i++) {
            cols[0] += foods.current[i].protein;
            cols[1] += foods.current[i].carb;
            cols[2] += foods.current[i].fibre;
            cols[3] += foods.current[i].fat;
        }

        return (
            <tr>
                <td className="whitespace-nowrap w-full">Total</td>
                <td className="text-center pr-1">-</td>
                <td className="text-center pr-1">{cols[0].toFixed(3)}</td>
                <td className="text-center pr-1">{cols[1].toFixed(3)}</td>
                <td className="text-center pr-1">{cols[2].toFixed(3)}</td>
                <td className="text-center">{cols[3].toFixed(3)}</td>
            </tr>
        );
    };

    const netCarb = calcNetCarbs();
    const insulin = CalcInsulin(netCarb, bloodSugar, 5.7, 10, 3);
    return (
        <>
            <div className="flex w-full mb-4">
                <FuzzySearch<TblUserEvent>
                    query={event}
                    onQueryChange={setEvent}
                    data={p.events}
                    searchKey={'name'}
                    className="w-full my-1 sm:mr-1"
                    placeholder="Event"
                    onSelect={(evnt: TblUserEvent | null) => {
                        if (evnt) {
                            setEvent(evnt.name);
                        }
                    }}
                />

                <input
                    class="w-full my-1 sm:mx-1"
                    type="datetime-local"
                    name="Event Date"
                    onChange={onEventTimeChange}
                    value={eventTime.toISOString().substring(0, 16)}
                />
            </div>

            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="font-semibold text-xs border-b">
                        <th className="text-left py-1">
                            {' '}
                            <button
                                onClick={() => {
                                    foods.current.push(TblUserFoodLogFactory.empty());
                                    render();
                                }}
                            >
                                Add Row
                            </button>
                        </th>
                        <th className="text-center py-1">Amount</th>
                        <th className="text-center py-1">Protein</th>
                        <th className="text-center py-1">Carbs</th>
                        <th className="text-center py-1">Fibre</th>
                        <th className="text-center py-1">Fat</th>
                        <th className="text-center py-1" />
                    </tr>
                </thead>

                <tbody>
                    {buildSumHeader()}
                    {foods.current.map((food: TblUserFoodLog, index: number) => (
                        <AddEventsPanelRow
                            key={food.id}
                            foods={p.foods}
                            food={food}
                            render={render}
                            deleteSelf={() => {
                                foods.current.splice(index, 1);
                                render();
                            }}
                        />
                    ))}
                </tbody>
            </table>
            <div className="w-full flex flex-none justify-end">
                <span className="px-2"> Insulin Calc: {insulin.toFixed(3)} </span>
                <span className="px-2 font-bold"> Net Carbs: {netCarb.toFixed(3)} </span>
            </div>

            <div className="w-full flex flex-row flex-none justify-evenly">
                <NumberInput2
                    className="whitespace-nowrap my-1 mx-1 min-w-32"
                    innerClassName="w-full"
                    label="Blood Sugar"
                    value={bloodSugar}
                    onValueChange={setBloodSugar}
                    min={0}
                />
                <NumberInput2
                    className="whitespace-nowrap my-1 mx-1 min-w-32"
                    innerClassName="w-full"
                    label="Insulin Taken"
                    value={insulinTaken}
                    onValueChange={setInsulinTaken}
                    min={0}
                />
                <input className="w-full my-1 mx-1 max-w-32" type="submit" value="Cancel" />
                <input className="w-full my-1 mx-1 max-w-32" type="submit" value="Create" />
            </div>
        </>
    );
}
