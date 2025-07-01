import {useEffect, useState, useMemo} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {InsertUserFoodLog, TblUserEvent, TblUserFoodLog} from '../../api/types';
import {GetUserFoodLog} from '../../api/api';
import {FoodInput} from '../../components/foodinput';
import {formatSmartTimestamp} from '../../utils/date_utils';
import {FuzzySearch} from '../../components/select_list';

export function EventLogPage(state: BaseState) {
    const [foodlog, setFoodlog] = useState<Array<InsertUserFoodLog>>([]);
    const [event, setEvent] = useState<string>('');

    const [totalProtein, totalCarbs, totalFibre, totalFat, netCarbs] = useMemo(() => {
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFibre = 0;
        let totalFat = 0;
        let netCarbs = 0;
        for (let i = 0; i < foodlog.length; i++) {
            const food = foodlog[i];
            totalProtein += food.protein;
            totalCarbs += food.carb;
            totalFibre += food.fibre;
            totalFat += food.fat;
            netCarbs += food.carb - food.fibre;
        }
        return [totalProtein, totalCarbs, totalFibre, totalFat, netCarbs];
    }, [foodlog]);

    const onSelectEvent = (evnt: TblUserEvent | null) => {
        if (evnt) {
            setEvent(evnt.name);
        }
    };

    const onSubmitFood = (food: InsertUserFoodLog, clear: () => void, setError: (msg: string | null) => void) => {
        if (!food.name) {
            setError('Food must have a name');
            return;
        }
        setFoodlog((prev) => (prev ? [food, ...prev] : [food]));
        clear();
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-4">
            <div className="flex justify-evenly">
                <FuzzySearch<TblUserEvent>
                    query={event}
                    onQueryChange={setEvent}
                    data={state.events}
                    searchKey={'name'}
                    class="w-full my-1 sm:mr-1"
                    placeholder="Event"
                    onSelect={onSelectEvent}
                />
                <span>{formatSmartTimestamp(new Date().getUTCMilliseconds())} </span>
            </div>

            <FoodInput foods={state.foods} events={state.events} showEventInput={false} onSubmit={onSubmitFood} />

            <div className="w-full space-y-4 rounded-sm p-2 border border-c-yellow">
                <div className="p-2 m-0">
                    <div className="font-semibold">Total</div>
                    <div className="flex flex-wrap justify-evenly">
                        <span class="px-2 whitespace-nowrap">{totalProtein.toFixed(3)} Protein </span>
                        <span class="px-2 whitespace-nowrap">{totalCarbs.toFixed(3)} Carb </span>
                        <span class="px-2 whitespace-nowrap">{totalFibre.toFixed(3)} Fibre </span>
                        <span class="px-2 whitespace-nowrap">{totalFat.toFixed(3)} Fat </span>
                        <span class="px-2 whitespace-nowrap font-bold">{netCarbs.toFixed(3)} Net Carbs </span>
                    </div>
                </div>

                {foodlog.map((food: TblUserFoodLog) => {
                    const netCarbs = food.carb - food.fibre;

                    return (
                        <div key={food.id} className="p-2 m-0">
                            <div className="flex justify-between font-semibold m-0">
                                <div>
                                    <span> {food.name} </span>
                                    <span>
                                        {' '}
                                        {food.portion} {food.unit}{' '}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-evenly">
                                <span class="px-2 whitespace-nowrap">{food.protein.toFixed(3)} Protein </span>
                                <span class="px-2 whitespace-nowrap">{food.carb.toFixed(3)} Carb </span>
                                <span class="px-2 whitespace-nowrap">{food.fibre.toFixed(3)} Fibre </span>
                                <span class="px-2 whitespace-nowrap">{food.fat.toFixed(3)} Fat </span>
                                <span class="px-2 whitespace-nowrap font-bold">{netCarbs.toFixed(3)} Net Carbs </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
