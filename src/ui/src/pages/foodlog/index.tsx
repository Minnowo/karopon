import {useEffect, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {InsertUserFoodLog, TblUserFoodLog} from '../../api/types';
import {GetUserFoodLog, LogFood} from '../../api/api';
import {FoodInput} from '../../components/foodinput';
import {formatSmartTimestamp} from '../../utils/date_utils';

export function FoodLogPage(state: BaseState) {
    const [foodlog, setFoodlog] = useState<Array<TblUserFoodLog> | null>(null);

    useEffect(() => {
        GetUserFoodLog().then((r) => setFoodlog(r));
    }, []);

    if (foodlog === null) {
        return <div class="">loading...</div>;
    }

    const onSubmitFood = (food: InsertUserFoodLog, clear: () => void, setError: (msg: string | null) => void) => {
        LogFood(food).then((fullFood) => {
            if (fullFood === null) {
                setError('There was an error logging the food.');
            } else {
                setFoodlog((prev) => (prev ? [fullFood, ...prev] : [fullFood]));
                setError(null);
                clear();
            }
        });
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-4">
            <FoodInput foods={state.foods} events={state.events} onSubmit={onSubmitFood} />

            <div className="w-full space-y-4">
                {foodlog.map((food: TblUserFoodLog) => {
                    const t = formatSmartTimestamp(food.user_time);
                    const netCarbs = food.carb - food.fibre;

                    return (
                        <div key={food.id} className="rounded-sm p-2 border container-theme">
                            <div className="flex justify-between font-semibold mb-2">
                                <div>
                                    <span> {food.name} </span>
                                    <span>
                                        {' '}
                                        {food.portion} {food.unit}{' '}
                                    </span>
                                </div>
                                <div>
                                    <span> {food.event ? `${food.event} ` : ''} </span>
                                    <span>{t}</span>
                                </div>
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
                })}
            </div>
        </div>
    );
}
