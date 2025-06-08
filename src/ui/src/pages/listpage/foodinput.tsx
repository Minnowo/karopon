import { useState, useRef } from "preact/hooks";
import { LogFood } from "../../api/api";
import { TblUserFood } from "../../api/types";
import { NumberInput } from "../../components/numberinput";
import { FuzzySearch } from "../../components/select_list";

type FoodInputProps = {
    foods: TblUserFood[];
};
export function FoodInput({ foods }: FoodInputProps) {
    const [food, setFood] = useState<string>("");
    const [event, setEvent] = useState<string>("");
    const [unit, setUnit] = useState<string>("");
    const [carb, setCarb] = useState<number>(0);
    const [portion, setPortion] = useState<number>(1);
    const [protein, setProtein] = useState<number>(0);
    const [fibre, setFibre] = useState<number>(0);
    const [fat, setFat] = useState<number>(0);

    const clear = () => {
        setFood("");
        setEvent("");
        setUnit("");
        setCarb(0);
        setPortion(1);
        setProtein(0);
        setFibre(0);
        setFat(0);
    };

    const onFoodSelected = (f: TblUserFood) => {
        setFood(f.name);
        setUnit(f.unit);
        setCarb(f.carb);
        setPortion(f.portion);
        setProtein(f.protein);
        setFibre(f.fibre);
        setFat(f.fat);
    };

    function handleSubmit(e: Event) {
        e.preventDefault();

        console.log({ food, event, unit, carb, protein, fibre, fat });

        const aFood: TblUserFood = {
            id: 0,
            user_id: 0,
            name: food,
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

    return (
        <form class="w-full p-8" onSubmit={handleSubmit}>
            <div class="flex flex-col">
                <FuzzySearch<TblUserFood>
                    query={food}
                    onQueryChange={setFood}
                    data={foods}
                    searchKey={"name"}
                    class="w-full my-1"
                    placeholder="Food"
                    onSelect={onFoodSelected}
                />

                <div class="flex flex-col sm:flex-row">
                    <input
                        class="w-full my-1 sm:mr-1"
                        type="text"
                        placeholder="Event"
                        value={event}
                        onInput={(e) =>
                            setEvent((e.target as HTMLInputElement).value)
                        }
                    />
                    <input
                        class="w-full my-1 sm:ml-1"
                        type="text"
                        placeholder="Unit"
                        value={unit}
                        onInput={(e) =>
                            setUnit((e.target as HTMLInputElement).value)
                        }
                    />
                </div>

                <div class="flex sm:flex-row">
                    <NumberInput
                        class="w-full my-1 mr-1"
                        label="Portion"
                        value={portion}
                        onChange={setPortion}
                    />
                    <NumberInput
                        class="w-full my-1 ml-1"
                        label="Carb"
                        value={carb}
                        onChange={setCarb}
                    />
                </div>
                <div class="flex sm:flex-row">
                    <NumberInput
                        class="w-full my-1 mr-1"
                        label="Protein"
                        value={protein}
                        onChange={setProtein}
                    />
                    <NumberInput
                        class="w-full my-1 ml-1"
                        label="Fibre"
                        value={fibre}
                        onChange={setFibre}
                    />
                </div>
                <div class="flex sm:flex-row">
                    <NumberInput
                        class="w-full my-1 mr-1"
                        label="Fat"
                        value={fat}
                        onChange={setFat}
                    />
                    <input class="w-full my-1 ml-1" type="submit" value="Add" />
                </div>
            </div>
        </form>
    );
}
