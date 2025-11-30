import {useEffect, useRef, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {CreateUserEventLog, InsertUserFoodLog, TblUserEvent, TblUserFood, TblUserFoodLog} from '../../api/types';
import {GetUserFoodLog, LogEvent, LogFood} from '../../api/api';
import {FoodInput} from '../../components/food_input';
import {formatSmartTimestamp} from '../../utils/date_utils';
import {Fragment} from 'preact/jsx-runtime';
import {DropdownButton} from '../../components/drop_down_button';
import {DownloadData} from '../../utils/download';
import {FuzzySearch} from '../../components/select_list';
import {ChangeEvent} from 'preact/compat';
import {DoRender} from '../../hooks/doRender';
import {NumberInput2} from '../../components/number_input2';
import {AddEventsPanel} from './add_event_panel';

interface FoodGroup {
    id: number | null;
    foods: TblUserFoodLog[];

    protein: number;
    carb: number;
    fibre: number;
    fat: number;
}

async function getGroupedFoodLog(): Promise<FoodGroup[]> {
    const foodLog: TblUserFoodLog[] = await GetUserFoodLog();

    let groups = new Array<FoodGroup>();
    let group: FoodGroup | null = null;

    for (let i = 0; i < foodLog.length; i++) {
        const food = foodLog[i];

        if (group !== null && group.id !== null && group.id === food.eventlog_id) {
            group.foods.push(food);
            group.protein += food.protein;
            group.carb += food.carb;
            group.fibre += food.fibre;
            group.fat += food.fat;
        } else {
            if (group !== null) {
                groups.push(group);
            }

            group = {
                id: food.eventlog_id,
                foods: [food],
                protein: food.protein,
                carb: food.carb,
                fibre: food.fibre,
                fat: food.fat,
            };
        }
    }

    return groups;
}

export function EventsPage(state: BaseState) {
    const [foodlog, setFoodlog] = useState<Array<FoodGroup> | null>(null);
    const [showNewEventPanel, setShowNewEventPanel] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        getGroupedFoodLog().then((r) => setFoodlog(r));
    }, []);

    if (foodlog === null) {
        return <div class="">loading...</div>;
    }

    const onCreateEvent = (eventlog: CreateUserEventLog, clear: () => void) => {
        LogEvent(eventlog)
            .then(() => {
                clear();
            })
            .catch((e: Error) => setErrorMsg(e.message));
    };

    const onSubmitFood = (food: InsertUserFoodLog, clear: () => void, setError: (msg: string | null) => void) => {
        LogFood(food).then((fullFood) => {
            if (fullFood === null) {
                setError('There was an error logging the food.');
            } else {
                const arr: FoodGroup = {
                    id: null,
                    foods: [fullFood],
                    protein: fullFood.protein,
                    carb: fullFood.carb,
                    fibre: fullFood.fibre,
                    fat: fullFood.fat,
                };
                setFoodlog((prev) => (prev ? [arr, ...prev] : [arr]));
                setError(null);
                clear();
            }
        });
    };

    return (
        <>

            <div className="w-full flex justify-evenly p-4">
                <button className="w-32" onClick={() => setShowNewEventPanel((x) => !x)}>
                    Add New Food
                </button>
                <button className="w-32">Import</button>
                <DropdownButton
                    buttonClassName="w-full h-full"
                    className="w-32"
                    label="Export"
                    actions={[
                        {
                            label: 'As JSON',
                            onClick: () => {
                                const jsonStr = JSON.stringify(foodlog, null, 2);
                                const blob = new Blob([jsonStr], {type: 'application/json'});
                                DownloadData(blob, 'food-log.json');
                            },
                        },
                    ]}
                />
            </div>

            {errorMsg !== null && <div className="text-c-l-red">{errorMsg}</div>}
            {showNewEventPanel && <AddEventsPanel foods={state.foods} events={state.events} createEvent={onCreateEvent} />}

            <div className="w-full space-y-4">
                {foodlog.map((foodGroup: FoodGroup) => {
                    const key = foodGroup.id === null ? `f_${foodGroup.foods[0].id}` : `e_${foodGroup.id}`;

                    return (
                        <div key={key} className="w-full p-2 border container-theme">
                            <div className="flex flex-row w-full justify-between">
                                <div className="align-middle text-s font-semibold">
                                    {`${foodGroup.foods[0].event} `} {formatSmartTimestamp(foodGroup.foods[0].user_time)}
                                </div>

                                <DropdownButton
                                    actions={[
                                        {label: 'Copy', onClick: () => {}},
                                        {label: 'Edit', onClick: () => {}},
                                        {label: 'Delete', onClick: () => {}},
                                    ]}
                                />
                            </div>

                            <div className="w-full mt-2 hidden sm:block">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="font-semibold text-xs border-b">
                                            <th className="text-left py-1"> </th>
                                            <th className="text-right py-1">Amount</th>
                                            <th className="text-right py-1">Protein</th>
                                            <th className="text-right py-1">Carbs</th>
                                            <th className="text-right py-1">Fibre</th>
                                            <th className="text-right py-1">Fat</th>
                                            <th className="text-right py-1">NetCarbs</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {foodGroup.foods.length > 1 && (
                                            <tr>
                                                <td className="whitespace-nowrap">Total</td>
                                                <td className="text-right">-</td>
                                                <td className="text-right">{foodGroup.protein.toFixed(3)}</td>
                                                <td className="text-right">{foodGroup.carb.toFixed(3)}</td>
                                                <td className="text-right">{foodGroup.fibre.toFixed(3)}</td>
                                                <td className="text-right">{foodGroup.fat.toFixed(3)}</td>
                                                <th className="text-right">{(foodGroup.carb - foodGroup.fibre).toFixed(3)}</th>
                                            </tr>
                                        )}
                                        {foodGroup.foods.map((food: TblUserFoodLog) => (
                                            <tr key={food.id}>
                                                <td className="whitespace-nowrap max-w-[150px]">
                                                    <div className="overflow-x-scroll">{food.name}</div>
                                                </td>
                                                <td className="text-right whitespace-nowrap">
                                                    {food.portion} {food.unit}
                                                </td>
                                                <td className="text-right">{food.protein.toFixed(3)}</td>
                                                <td className="text-right">{food.carb.toFixed(3)}</td>
                                                <td className="text-right">{food.fibre.toFixed(3)}</td>
                                                <td className="text-right">{food.fat.toFixed(3)}</td>
                                                <td className="text-right">{(food.carb - food.fibre).toFixed(3)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
