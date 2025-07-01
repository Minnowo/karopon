import {useState} from 'preact/hooks';
import {LogFood} from '../api/api';
import {TblUserFood, TblUserFoodLog, InsertUserFoodLog, TblUserEvent} from '../api/types';
import {NumberInput} from './numberinput';
import {FuzzySearch} from './select_list';

type FoodInputProps = {
    foods: TblUserFood[];
    events: TblUserEvent[];
    showEventInput?: boolean;
    onSubmit: (log: InsertUserFoodLog, clear: () => void, setErrorMsg: (msg: string | null) => void) => void;
};
export function FoodInput({foods, events, showEventInput = true, onSubmit}: FoodInputProps) {
    const [selectedFood, setSelectedFood] = useState<TblUserFood | null>(null);
    const [food, setFood] = useState<string>('');
    const [event, setEvent] = useState<string>('');
    const [unit, setUnit] = useState<string>('');
    const [carb, setCarb] = useState<number>(0);
    const [portion, setPortion] = useState<number>(1);
    const [protein, setProtein] = useState<number>(0);
    const [fibre, setFibre] = useState<number>(0);
    const [fat, setFat] = useState<number>(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const clear = () => {
        setSelectedFood(null);
        setFood('');
        setEvent('');
        setUnit('');
        setCarb(0);
        setPortion(1);
        setProtein(0);
        setFibre(0);
        setFat(0);
    };

    const onEventSelected = (f: TblUserEvent | null) => {
        if (f !== null) {
            setEvent(f.name);
        }
    };
    const onFoodSelected = (f: TblUserFood | null) => {
        if (f === null) {
            setSelectedFood(null);
        } else {
            setSelectedFood(f);
            setFood(f.name);
            setUnit(f.unit);
            setPortion(f.portion);
            setCarb(f.carb * f.portion);
            setProtein(f.protein * f.portion);
            setFibre(f.fibre * f.portion);
            setFat(f.fat * f.portion);
        }
    };

    const handleSubmit = (e: Event) => {
        e.preventDefault();

        const aFood: InsertUserFoodLog = {
            name: food,
            event,
            unit,
            portion,
            protein,
            carb,
            fibre,
            fat,
        };

        onSubmit(aFood, clear, setErrorMsg);
    };

    const updateWithPortion = (p: number) => {
        setPortion(p);
        if (selectedFood) {
            setCarb(selectedFood.carb * p);
            setProtein(selectedFood.protein * p);
            setFibre(selectedFood.fibre * p);
            setFat(selectedFood.fat * p);
        }
    };

    return (
        <form class="w-full" onSubmit={handleSubmit}>
            {errorMsg !== null ? <div class="text-c-red"> {errorMsg} </div> : null}

            <div class="flex flex-col">
                <FuzzySearch<TblUserFood>
                    query={food}
                    onQueryChange={setFood}
                    data={foods}
                    searchKey={'name'}
                    class="w-full my-1"
                    placeholder="Food"
                    onSelect={onFoodSelected}
                />

                <div class="flex flex-col sm:flex-row">
                    {showEventInput ? (
                        <FuzzySearch<TblUserEvent>
                            query={event}
                            onQueryChange={setEvent}
                            data={events}
                            searchKey={'name'}
                            class="w-full my-1 sm:mr-1"
                            placeholder="Event"
                            onSelect={onEventSelected}
                        />
                    ) : null}
                    <input
                        class="w-full my-1 sm:ml-1"
                        type="text"
                        placeholder="Unit"
                        value={unit}
                        onInput={(e) => setUnit((e.target as HTMLInputElement).value)}
                    />
                </div>

                <div class="flex sm:flex-row">
                    <NumberInput
                        class="w-full my-1 mr-1"
                        label="Portion"
                        min={0.01}
                        inputMin={0}
                        value={portion}
                        onChange={updateWithPortion}
                    />
                    <NumberInput class="w-full my-1 ml-1" label="Carb" min={0} value={carb} onChange={setCarb} />
                </div>
                <div class="flex sm:flex-row">
                    <NumberInput class="w-full my-1 mr-1" label="Protein" min={0} value={protein} onChange={setProtein} />
                    <NumberInput class="w-full my-1 ml-1" label="Fibre" min={0} value={fibre} onChange={setFibre} />
                </div>
                <div class="flex sm:flex-row">
                    <NumberInput class="w-full my-1 mr-1" label="Fat" min={0} value={fat} onChange={setFat} />
                    <input class="w-full my-1 ml-1" type="submit" value="Add" />
                </div>
            </div>
        </form>
    );
}
