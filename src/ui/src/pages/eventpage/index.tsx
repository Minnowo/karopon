import {useEffect, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {InsertUserFoodLog, TblUserFoodLog} from '../../api/types';
import {GetUserFoodLog, LogFood} from '../../api/api';
import {FoodInput} from '../../components/food_input';
import {formatSmartTimestamp} from '../../utils/date_utils';
import {Fragment} from 'preact/jsx-runtime';

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

    useEffect(() => {
        getGroupedFoodLog().then((r) => setFoodlog(r));
    }, []);

    if (foodlog === null) {
        return <div class="">loading...</div>;
    }

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

    const renderFood = (food: TblUserFoodLog, isInGroup: boolean) => {
        const t = formatSmartTimestamp(food.user_time);
        const netCarbs = food.carb - food.fibre;

        const css = isInGroup ? '' : 'border container-theme';

        return (
            <div key={`foodlog_${food.id}`} className={`overflow-x-scroll rounded-sm p-2 ${css}`}>
                <div className="flex justify-between font-semibold mb-2">
                    <div>
                        <span> {food.name} </span>
                        <span>
                            {' '}
                            {food.portion} {food.unit}{' '}
                        </span>
                    </div>
                    {isInGroup ? null : (
                        <div>
                            <span> {food.event ? `${food.event} ` : ''} </span>
                            <span>{t}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap">
                    <span class="mx-1 whitespace-nowrap">{food.carb.toFixed(3)} Carb </span>
                    <span class="mx-1 whitespace-nowrap">{food.protein.toFixed(3)} Protein </span>
                    <span class="mx-1 whitespace-nowrap">{food.fibre.toFixed(3)} Fibre </span>
                    <span class="mx-1 whitespace-nowrap">{food.fat.toFixed(3)} Fat </span>
                    <span class="mx-1 whitespace-nowrap font-bold">{netCarbs.toFixed(3)} Net Carbs </span>
                </div>
            </div>
        );
    };

    const renderFoodGroup = (food: TblUserFoodLog) => {
        return renderFood(food, true);
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-4">
            <FoodInput foods={state.foods} events={state.events} onSubmit={onSubmitFood} />

            <div className="w-full space-y-4">
                {foodlog.map((foodGroup: FoodGroup) => {
                    if (foodGroup.id === null) {
                        return renderFood(foodGroup.foods[0], false);
                    }

                    const netCarbs = foodGroup.carb - foodGroup.fibre;

                    return (
                        <div key={`eventlog_${foodGroup.id}`} className="w-full p-2 border container-theme">
                            <div className="text-xs font-semibold">
                                <span>{`${foodGroup.foods[0].event} `}</span>
                                <span>{formatSmartTimestamp(foodGroup.foods[0].user_time)}</span>
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
                                        <tr>
                                            <td className="whitespace-nowrap">Total</td>
                                            <td className="text-right">-</td>
                                            <td className="text-right">{foodGroup.protein.toFixed(3)}</td>
                                            <td className="text-right">{foodGroup.carb.toFixed(3)}</td>
                                            <td className="text-right">{foodGroup.fibre.toFixed(3)}</td>
                                            <td className="text-right">{foodGroup.fat.toFixed(3)}</td>
                                            <th className="text-right">{netCarbs.toFixed(3)}</th>
                                        </tr>
                                        {foodGroup.foods.map((food: TblUserFoodLog) => (
                                            <tr key={food.id}>
                                                <td className="whitespace-nowrap max-w-[150px]">
                                                <div className="overflow-x-scroll">
                                                    {food.name}
                                                </div>
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
        </div>
    );
}
