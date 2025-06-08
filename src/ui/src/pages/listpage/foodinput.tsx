import { useState } from "preact/hooks";
import { LogFood } from "../../api/api";
import { TblUserFood } from "../../api/types";

export function AddFoodInput() {

    const [food, setFood] = useState<string>("");
    const [event, setEvent] = useState<string>("");
    const [unit, setUnit] = useState<string>("");
    const [carb, setCarb] = useState<number>(0);
    const [portion, setPortion] = useState<number>(0);
    const [protein, setProtein] = useState<number>(0);
    const [fibre, setFibre] = useState<number>(0);
    const [fat, setFat] = useState<number>(0);

    function clear() {
     setFood("");
     setEvent("");
     setUnit("");
     setCarb(0);
     setPortion(0);
     setProtein(0);
     setFibre(0);
     setFat(0);
    }

    function handleSubmit(e: Event) {
        e.preventDefault();
        // Do something with the data
        console.log({ food, event, unit, carb, protein, fibre, fat });

        const aFood : TblUserFood = {
            id: 0,
            user_id: 0,
            name: food,
            unit,
            portion,
            protein,
            carb,
            fibre,
            fat
        };

        LogFood(aFood).then(ok => {

            if(ok) {
                clear();
            }
        });
    }

    return (
        <form class="w-full p-16" onSubmit={handleSubmit}>


        <div class="flex flex-col">

        <input class="w-full my-1" type="text" placeholder="Food" value={food} onInput={e => setFood((e.target as HTMLInputElement).value)} />

        <div class="flex flex-col sm:flex-row">
        <input class="w-full my-1" type="text" placeholder="Event" value={event} onInput={e => setEvent((e.target as HTMLInputElement).value)} />
        <input class="w-full my-1" type="text" placeholder="Unit" value={unit} onInput={e => setUnit((e.target as HTMLInputElement).value)} />
        </div>

        <div class="flex flex-col sm:flex-row">

        <div class="flex flex-col">
        <div class="flex flex-row">
        <div class="w-1/2 text-right">
        Portion
        </div>
        <input class="w-full inline-block" type="number" placeholder="Portion" min={0.01} step="any" value={portion} onInput={e => setPortion(parseFloat((e.target as HTMLInputElement).value) || 0)} />
        </div>

        <div class="flex flex-row">
        <div class="w-1/2 text-right">
        Carb
        </div>
        <input class="w-full" type="number" placeholder="Carb" min={0} step="any" value={carb} onInput={e => setCarb(parseFloat((e.target as HTMLInputElement).value) || 0)} />
        </div>
        </div>

        <div class="flex flex-col">
        <div class="flex flex-row">
        <div class="w-1/2 text-right">
        Protein
        </div>
        <input class="w-full" type="number" placeholder="Protein" min={0}step="any" value={protein} onInput={e => setProtein(parseFloat((e.target as HTMLInputElement).value) || 0)} />
        </div>

        <div class="flex flex-row">
        <div class="w-1/2 text-right">
        Fibre
        </div>
        <input class="w-full" type="number" placeholder="Fibre" min={0}step="any" value={fibre} onInput={e => setFibre(parseFloat((e.target as HTMLInputElement).value) || 0)} />
        </div>
        </div>

        <div class="flex flex-col">
        <div class="flex flex-row">
        <div class="w-1/2 text-right">
        Fat
        </div>
        <input class="w-full" type="number" placeholder="Fat" min={0}step="any" value={fat} onInput={e => setFat(parseFloat((e.target as HTMLInputElement).value) || 0)} />
        </div>
        </div>
        </div>
        <input class="w-full my-1" type="submit" value="Add" />
        </div>
        </form>
    );
}
