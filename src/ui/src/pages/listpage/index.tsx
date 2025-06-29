import {useEffect, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {TblUserFoodLog, TblUserFood} from '../../api/types';
import {GetUserFoodLog} from '../../api/api';
import {FoodInput} from './foodinput';
import {FuzzySearch} from '../../components/select_list';
import {formatSmartTimestamp} from '../../utils/date_utils';

export function ListPage(state: BaseState) {
    const [foodlog, setFoodlog] = useState<Array<TblUserFoodLog> | null>(null);

    useEffect(() => {
        GetUserFoodLog().then((r) => setFoodlog(r));
    }, []);

    if (foodlog === null) {
        return <div class="">loading...</div>;
    }

    const onFoodLogCreated = (food: TblUserFoodLog) => {
        if (food === null) {
            return;
        }
        setFoodlog((prev) => (prev ? [food, ...prev] : [food]));
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-4">
            <FoodInput foods={state.foods} events={state.events} onFoodLogCreated={onFoodLogCreated} />

            <div className="w-full space-y-4">
                {foodlog.map((food: TblUserFoodLog) => {
                    const t = formatSmartTimestamp(food.user_time);

                    return (
                        <div key={food.id} className="rounded-sm p-2 border border-c-yellow">
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
                                <span class="mx-1 whitespace-nowrap">{food.carb} Carb </span>
                                <span class="mx-1 whitespace-nowrap">{food.protein} Protein </span>
                                <span class="mx-1 whitespace-nowrap">{food.fibre} Fibre </span>
                                <span class="mx-1 whitespace-nowrap">{food.fat} Fat </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
