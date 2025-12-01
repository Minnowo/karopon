import {useEffect, useRef, useState} from 'preact/hooks';
import {CreateUserEventLog, InsertUserFoodLog, TblUserEvent, TblUserFood, TblUserFoodLog} from '../../api/types';
import {FuzzySearch} from '../../components/select_list';
import {ChangeEvent} from 'preact/compat';
import {DoRender} from '../../hooks/doRender';
import {NumberInput2} from '../../components/number_input2';
import {TblUserFoodLogFactory} from '../../api/factories';
import {CalcInsulin} from '../../utils/insulin';
import {Calories} from '../../utils/calories';
import {JSX} from 'preact';

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
                            food.name = q;
                            render();
                        }}
                        data={foods}
                        searchKey={'name'}
                        className="w-full my-1 sm:mr-1"
                        placeholder="Food Name"
                        noResultsText="New Food"
                        onSelect={(newFood: TblUserFood | null) => {
                            if (!newFood) {
                                // The user may be creating a new food.
                                food.name = foodTemplate.current.name;
                                return;
                            }
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
                        }}
                    />
                </td>
                <td className="whitespace-nowrap w-full pr-1">
                    <input
                        className="w-full min-w-8"
                        tabindex={-1}
                        type="text"
                        value={food.unit}
                        onInput={(e: JSX.TargetedInputEvent<HTMLInputElement>) => {
                            food.unit = e.currentTarget.value;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput2
                        innerClassName="w-8"
                        round={1}
                        min={0}
                        value={food.portion}
                        onValueChange={(v) => {
                            food.portion = v;
                            if (foodTemplate.current.id > 0) {
                                food.carb = foodTemplate.current.carb * v;
                                food.protein = foodTemplate.current.protein * v;
                                food.fat = foodTemplate.current.fat * v;
                                food.fibre = foodTemplate.current.fibre * v;
                            }
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput2
                        innerClassName="w-8"
                        innerTabIndex={-1}
                        round={1}
                        min={0}
                        value={food.protein}
                        onValueChange={(v) => {
                            food.protein = v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput2
                        innerClassName="w-8"
                        innerTabIndex={-1}
                        round={1}
                        min={0}
                        value={food.carb}
                        onValueChange={(v) => {
                            food.carb = v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput2
                        innerClassName="w-8"
                        innerTabIndex={-1}
                        round={1}
                        min={0}
                        value={food.fibre}
                        onValueChange={(v) => {
                            food.fibre = v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput2
                        innerClassName="w-8"
                        innerTabIndex={-1}
                        round={1}
                        min={0}
                        value={food.fat}
                        onValueChange={(v) => {
                            food.fat = v;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1 text-center">{(food.carb - food.fibre).toFixed(1)}</td>
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
    createEvent: (e: CreateUserEventLog, doClear: () => void) => void;
}

export function AddEventsPanel(p: AddEventsPanelState) {
    const [event, setEvent] = useState<string>('');
    const [eventTime, setEventTime] = useState<Date>(new Date());
    const [bloodSugar, setBloodSugar] = useState<number>(0);
    const [insulinSensitivity, setInsulinSensitivity] = useState<number>(0);
    const [insulinTaken, setInsulinTaken] = useState<number>(0);
    const foods = useRef<TblUserFoodLog[]>([
        TblUserFoodLogFactory.empty(),
        TblUserFoodLogFactory.empty(),
        TblUserFoodLogFactory.empty(),
    ]);

    const render = DoRender();

    const totals = (() => {
        const cols = [0, 0, 0, 0];
        for (let i = 0; i < foods.current.length; i++) {
            cols[0] += foods.current[i].protein;
            cols[1] += foods.current[i].carb;
            cols[2] += foods.current[i].fibre;
            cols[3] += foods.current[i].fat;
        }
        return {
            protein: cols[0],
            carb: cols[1],
            fibre: cols[2],
            fat: cols[3],
        };
    })();

    const netCarb = totals.carb - totals.fibre;
    const insulin = CalcInsulin(netCarb, bloodSugar, 5.7, 10, 3);

    const clear = () => {
        setEvent('');
        setEventTime(new Date());
        setBloodSugar(0);
        setInsulinTaken(0);
        foods.current.length = 0;
        foods.current.push(TblUserFoodLogFactory.empty());
        foods.current.push(TblUserFoodLogFactory.empty());
        foods.current.push(TblUserFoodLogFactory.empty());
    };

    const onCreateClick = () => {
        p.createEvent(
            {
                blood_glucose: bloodSugar,
                blood_glucose_target: 0,
                insulin_sensitivity_factor: 0,
                insulin_to_carb_ratio: 0,
                recommended_insulin_amount: 0,
                actual_insulin_taken: insulinTaken,
                event: {
                    id: 0,
                    user_id: 0,
                    name: event.trim(),
                },
                foods: foods.current
                    .map((x: TblUserFoodLog): InsertUserFoodLog => {
                        return {
                            name: x.name.trim(),
                            event: x.event.trim(),
                            unit: x.unit.trim(),
                            portion: x.portion,
                            protein: x.protein,
                            carb: x.carb,
                            fibre: x.fibre,
                            fat: x.fat,
                        };
                    })
                    .filter((x) => x.name.length > 0),
            },
            clear
        );
    };

    const onEventTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target) {
            const value = e.currentTarget.value;
            setEventTime(new Date(value));
        }
    };

    const buildSumHeader = () => {
        if (foods.current.length <= 1) {
            return <> </>;
        }

        return (
            <tr>
                <td className="whitespace-nowrap w-full">Total</td>
                <td className="text-center pr-1">-</td>
                <td className="text-center pr-1">-</td>
                <td className="text-center pr-1">{totals.protein.toFixed(1)}</td>
                <td className="text-center pr-1">{totals.carb.toFixed(1)}</td>
                <td className="text-center pr-1">{totals.fibre.toFixed(1)}</td>
                <td className="text-center pr-1"> {totals.fat.toFixed(1)}</td>
                <td className="text-center font-bold"> {netCarb.toFixed(1)}</td>
            </tr>
        );
    };

    return (
        <div className="w-full p-2 container-theme">
            <div className="flex w-full mb-4">
                <FuzzySearch<TblUserEvent>
                    query={event}
                    onQueryChange={setEvent}
                    data={p.events}
                    searchKey={'name'}
                    className="w-full my-1 sm:mr-1"
                    placeholder="Event Name"
                    noResultsText="New Event"
                    onSelect={(evnt: TblUserEvent | null) => {
                        if (evnt) {
                            setEvent(evnt.name);
                        }
                    }}
                />

                <input
                    tabindex={-1}
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
                    {buildSumHeader()}
                    {foods.current.map((food: TblUserFoodLog, index: number) => (
                        <AddEventsPanelRow
                            key={index}
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
                <span className="px-2"> Insulin Calc: {insulin.toFixed(1)} </span>
                <span className="px-2">
                    Calories: {Calories(totals.protein, totals.carb, totals.fibre, totals.fat).toFixed(1)}
                </span>
            </div>

            <div className="w-full flex flex-wrap flex-col sm:flex-row sm:justify-evenly justify-end">
                <NumberInput2
                    className="my-1 mx-1 flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label="Blood Sugar"
                    value={bloodSugar}
                    onValueChange={setBloodSugar}
                    min={0}
                />
                <NumberInput2
                    className="my-1 mx-1 flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label="Insulin Sensitivity"
                    value={insulinSensitivity}
                    onValueChange={setInsulinSensitivity}
                    min={0}
                />
                <NumberInput2
                    className="my-1 mx-1 flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label="Insulin Taken"
                    value={insulinTaken}
                    onValueChange={setInsulinTaken}
                    min={0}
                />
                <input className="w-full my-1 mx-1 sm:max-w-24" type="submit" value="Create" onClick={onCreateClick} />
            </div>
        </div>
    );
}
