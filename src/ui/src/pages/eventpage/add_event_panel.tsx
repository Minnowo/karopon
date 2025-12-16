import {useEffect, useRef, useState} from 'preact/hooks';
import {
    CreateUserEventLog,
    InsertUserFoodLog,
    TblUser,
    TblUserEvent,
    TblUserFood,
    TblUserFoodLog,
    UserEventFoodLog,
} from '../../api/types';
import {FuzzySearch} from '../../components/select_list';
import {ChangeEvent} from 'preact/compat';
import {DoRender} from '../../hooks/doRender';
import {NumberInput} from '../../components/number_input';
import {TblUserFoodLogFactory} from '../../api/factories';
import {CalcInsulin} from '../../utils/insulin';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';
import {JSX} from 'preact';
import {FormatDateForInput} from '../../utils/date_utils';
import {ErrorDiv} from '../../components/error_div';
import {DAY_IN_MS} from '../../utils/time';

type AddEventsPanelRowState = {
    food: TblUserFoodLog;
    foods: TblUserFood[];
    render: () => void;
    deleteSelf: () => void;
};

export function AddEventsPanelRow({foods, food, render, deleteSelf}: AddEventsPanelRowState) {
    // This only holds the base carb, fat, protein, fibre when the portion is 1.
    // We use this to scale by the portion, but still let the user type manually.
    const foodTemplate = useRef<TblUserFoodLog>({name: food.name} as TblUserFoodLog);

    useEffect(() => {
        if (food.name !== '') {
            for (let i = 0; i < foods.length; i++) {
                const match = foods[i];
                if (match.name === food.name) {
                    foodTemplate.current.id = match.id;
                    foodTemplate.current.unit = match.unit;
                    foodTemplate.current.portion = 1;
                    foodTemplate.current.protein = match.protein;
                    foodTemplate.current.carb = match.carb;
                    foodTemplate.current.fibre = match.fibre;
                    foodTemplate.current.fat = match.fat;
                    break;
                }
            }
        }
    }, [food, foods]);

    return (
        <>
            <tr>
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
                        className="w-full min-w-32 my-1 sm:mr-1"
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
                        placeholder={'g'}
                        onInput={(e: JSX.TargetedInputEvent<HTMLInputElement>) => {
                            food.unit = e.currentTarget.value;
                            render();
                        }}
                    />
                </td>
                <td className="pr-1">
                    <NumberInput
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
                    <NumberInput
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
                    <NumberInput
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
                    <NumberInput
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
                    <NumberInput
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
                    <button tabindex={-1} className="bg-c-l-red hover:bg-c-red px-1" onClick={() => deleteSelf()}>
                        X
                    </button>
                </td>
            </tr>
        </>
    );
}

type AddEventsPanelState = {
    dialogTitle: string;
    saveButtonTitle: string;
    user: TblUser;
    foods: TblUserFood[];
    events: TblUserEvent[];
    fromEvent: UserEventFoodLog;
    createEvent: (e: CreateUserEventLog) => void;
    actionButtons?: JSX.Element[];
    copyDate?: boolean;
};

type TblUserFoodLogWithKey = TblUserFoodLog & {
    key: number;
};

export function AddEventsPanel(p: AddEventsPanelState) {
    // Used for the foods array key={} when rendering the food list.
    // The foods array is a ref which is passed into the row component, where it is edited by ref.
    // This ensures that each row in the array has a unique key for proper re-render.
    const keyRef = useRef<number>(-1);

    const mutateWithKey = (l: TblUserFoodLog): TblUserFoodLogWithKey => {
        (l as TblUserFoodLogWithKey).key = --keyRef.current;
        return l as TblUserFoodLogWithKey;
    };

    const [event, setEvent] = useState<string>(p.fromEvent.eventlog.event);
    const [eventTime, setEventTime] = useState<Date>(p.copyDate ? new Date(p.fromEvent.eventlog.user_time) : new Date());
    const [didChangeTime, setDidChangeTime] = useState<boolean>(false);
    const [bloodSugar, setBloodSugar] = useState<number>(p.fromEvent.eventlog.blood_glucose);
    const [insulinToCarbRatio, setInsulinToCarbRatio] = useState<number>(p.fromEvent.eventlog.insulin_to_carb_ratio);
    const [insulinTaken, setInsulinTaken] = useState<number>(p.fromEvent.eventlog.actual_insulin_taken);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const foods = useRef<TblUserFoodLogWithKey[]>([]);

    const render = DoRender();

    useEffect(() => {
        setEvent(p.fromEvent.eventlog.event);
        setEventTime(p.copyDate ? new Date(p.fromEvent.eventlog.user_time) : new Date());
        setBloodSugar(p.fromEvent.eventlog.blood_glucose);
        setInsulinToCarbRatio(p.fromEvent.eventlog.insulin_to_carb_ratio);
        setInsulinTaken(p.fromEvent.eventlog.actual_insulin_taken);
        foods.current = p.fromEvent.foodlogs.map((x: TblUserFoodLog) => {
            return {...x, key: --keyRef.current};
        });
    }, [p.fromEvent, p.copyDate]);

    const reset = () => {
        setEvent('');
        setEventTime(new Date()); /// don't copy this because they're gonna just assume current time
        setBloodSugar(0);
        setInsulinToCarbRatio(0);
        setInsulinTaken(0);
        foods.current = [
            mutateWithKey(TblUserFoodLogFactory.empty()),
            mutateWithKey(TblUserFoodLogFactory.empty()),
            mutateWithKey(TblUserFoodLogFactory.empty()),
        ];
        DoRender();
    };

    const totals = (() => {
        const cols = [0, 0, 0, 0];
        for (let i = 0; i < foods.current.length; i++) {
            if (foods.current[i].portion !== 0 && foods.current[i].name !== '') {
                cols[0] += foods.current[i].protein;
                cols[1] += foods.current[i].carb;
                cols[2] += foods.current[i].fibre;
                cols[3] += foods.current[i].fat;
            }
        }
        return {
            protein: cols[0],
            carb: cols[1],
            fibre: cols[2],
            fat: cols[3],
        };
    })();

    const days = Math.floor(eventTime.getTime() / DAY_IN_MS); // used for left-right side tracking
    const netCarb = totals.carb - totals.fibre;
    const insulin = CalcInsulin(
        netCarb,
        bloodSugar,
        p.user.target_blood_sugar,
        insulinToCarbRatio,
        p.user.insulin_sensitivity_factor
    );

    const onCreateClick = () => {
        setErrorMsg(null);

        if (event.trim() === '') {
            setErrorMsg('Event name should not be empty');
            return;
        }

        if (p.user.show_diabetes) {
            if (bloodSugar <= 0) {
                setErrorMsg('Blood sugar should be a positive number');
                return;
            }

            if (insulinToCarbRatio <= 0) {
                setErrorMsg('Insulin sensitivity should be a positive number');
                return;
            }
        }

        p.createEvent({
            blood_glucose: bloodSugar,
            blood_glucose_target: p.user.target_blood_sugar,
            insulin_sensitivity_factor: p.user.insulin_sensitivity_factor,
            insulin_to_carb_ratio: insulinToCarbRatio,
            recommended_insulin_amount: insulin,
            actual_insulin_taken: insulinTaken,
            created_time: didChangeTime || p.copyDate ? eventTime.getTime() : 0, // for server generates the time
            event: {
                id: 0,
                user_id: p.user.id,
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
        });
    };

    const onEventTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target) {
            const value = e.currentTarget.value;
            setEventTime(new Date(value));
            setDidChangeTime(true);
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
        <div className="w-full p-2 container-theme bg-c-black">
            <div className="flex w-full justify-between">
                <span className="text-lg font-bold">{p.dialogTitle}</span>
                <div>
                    {p.actionButtons}
                    <button className="text-sm text-c-l-red font-bold w-24 mx-1" onClick={reset}>
                        Reset
                    </button>
                </div>
            </div>

            <ErrorDiv errorMsg={errorMsg} />
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
                    value={FormatDateForInput(eventTime)}
                />
            </div>

            <div className="overflow-x-scroll">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="font-semibold text-xs border-b">
                            <th className="text-left py-1">
                                <button
                                    onClick={() => {
                                        foods.current.push(mutateWithKey(TblUserFoodLogFactory.empty()));
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
                        {foods.current.map((food: TblUserFoodLogWithKey, index: number) => {
                            return (
                                <AddEventsPanelRow
                                    key={food.key}
                                    foods={p.foods}
                                    food={food}
                                    render={render}
                                    deleteSelf={() => {
                                        foods.current.splice(index, 1);
                                        render();
                                    }}
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="w-full flex flex-none justify-end">
                {p.user.show_diabetes && (
                    <>
                        <span className="px-2" title="Insulin injection location and blood meter prick side (changes daily)">
                            {`${days % 4 <= 1 ? 'Upper' : 'Lower'}-${days % 2 === 0 ? 'Left' : 'Right'}`}
                        </span>
                        <span className="px-2" title="Insulin calculated for this event's food">
                            {' '}
                            Insulin Calc {insulin.toFixed(1)}{' '}
                        </span>
                    </>
                )}
                <span className="px-2" title={`This event's calories, formula used: ${p.user.caloric_calc_method}`}>
                    Calories{' '}
                    {CalculateCalories(
                        totals.protein,
                        totals.carb - totals.fibre,
                        totals.fibre,
                        totals.fat,
                        Str2CalorieFormula(p.user.caloric_calc_method)
                    ).toFixed(1)}
                </span>
            </div>

            <div className="w-full flex flex-wrap flex-col sm:flex-row sm:justify-evenly justify-end">
                {p.user.show_diabetes && (
                    <>
                        <NumberInput
                            className="my-1 sm:mr-1 flex-1 flex-grow"
                            innerClassName="w-full min-w-12"
                            label="Blood Sugar"
                            value={bloodSugar}
                            onValueChange={setBloodSugar}
                            min={0}
                        />
                        <NumberInput
                            className="my-1 sm:mx-1 flex-1 flex-grow"
                            innerClassName="w-full min-w-12"
                            label="Insulin To Carb Ratio"
                            value={insulinToCarbRatio}
                            onValueChange={setInsulinToCarbRatio}
                            min={0}
                        />
                        <NumberInput
                            className="my-1 sm:mx-1 flex-1 flex-grow"
                            innerClassName="w-full min-w-12"
                            label="Insulin Taken"
                            value={insulinTaken}
                            onValueChange={setInsulinTaken}
                            min={0}
                        />
                    </>
                )}
                <input
                    className="w-full my-1 sm:ml-1 sm:max-w-32 text-c-l-green"
                    type="submit"
                    value={p.saveButtonTitle}
                    onClick={onCreateClick}
                />
            </div>
        </div>
    );
}
