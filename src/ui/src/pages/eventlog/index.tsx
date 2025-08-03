import {useEffect, useState, useMemo, useRef} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {CreateUserEventLog, InsertUserFoodLog, TblUserEvent, TblUserFoodLog} from '../../api/types';
import {GetUserFoodLog, LogEvent} from '../../api/api';
import {FoodInput} from '../../components/foodinput';
import {formatSmartTimestamp} from '../../utils/date_utils';
import {FuzzySearch} from '../../components/select_list';

export function EventLogPage(state: BaseState) {
    const [foodlog, setFoodlog] = useState<Array<InsertUserFoodLog>>([]);
    const [event, setEvent] = useState<string>('');
    const dateInput = useRef<HTMLInputElement>(null);

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

    const onCreate = () => {
        const data = {
            event: {
                name: event,
            } as TblUserEvent,
            foods: foodlog,
        } as CreateUserEventLog;

        LogEvent(data).then((json) => {
            console.log(json);
        });
    };

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

    const getDate = (): string => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-4">
            <div className="flex w-full">
                <FuzzySearch<TblUserEvent>
                    query={event}
                    onQueryChange={setEvent}
                    data={state.events}
                    searchKey={'name'}
                    class="w-full my-1 sm:mr-1"
                    placeholder="Event"
                    onSelect={onSelectEvent}
                />

                <input ref={dateInput} class="w-full my-1 sm:mx-1" type="datetime-local" name="Event Date" value={getDate()} />

                <input class="w-full my-1 ml-1" type="submit" value="Create" onClick={onCreate} />
            </div>

            <div class="w-full text-left">
                Add food to this event instance:
                <FoodInput foods={state.foods} events={state.events} showEventInput={false} onSubmit={onSubmitFood} />
                <div className="w-full space-y-4 rounded-sm p-2 mt-2 border container-theme">
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
        </div>
    );
}
