import {useState, useRef} from 'preact/hooks';
import {LogFood} from '../../api/api';
import {TblUserFood, TblUserFoodLog, InsertUserFoodLog, TblUserEvent} from '../../api/types';
import {NumberInput} from '../../components/numberinput';
import {FuzzySearch} from '../../components/select_list';

type FoodInputProps = {
    foods: TblUserFood[];
    events: TblUserEvent[];
};
export function FoodInput({foods, events}: FoodInputProps) {
    const [selectedFood, setSelectedFood] = useState<TblUserFood | null>(null);
    const [food, setFood] = useState<string>('');
    const [event, setEvent] = useState<string>('');
    const [unit, setUnit] = useState<string>('');
    const [carb, setCarb] = useState<number>(0);
    const [portion, setPortion] = useState<number>(1);
    const [protein, setProtein] = useState<number>(0);
    const [fibre, setFibre] = useState<number>(0);
    const [fat, setFat] = useState<number>(0);

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

    const onEventSelected = (f: TblUserEvent|null) => {
        if(f!==null){
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

    function handleSubmit(e: Event) {
        e.preventDefault();

        console.log({food, event, unit, carb, protein, fibre, fat});

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

        LogFood(aFood).then((ok) => {
            if (ok) {
                clear();
            }
        });
    }
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
                    <FuzzySearch<TblUserEvent>
                        query={event}
                        onQueryChange={setEvent}
                        data={events}
                        searchKey={'name'}
                        class="w-full my-1 sm:mr-1"
                        placeholder="Event"
                        onSelect={onEventSelected}
                    />
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
