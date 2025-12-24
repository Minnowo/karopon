import {useState, useMemo, useRef, useEffect} from 'preact/hooks';
import {TblUserFood} from '../../api/types';
import {ErrorDiv} from '../../components/error_div';
import {DoRender} from '../../hooks/doRender';
import {NumberInput} from '../../components/number_input';

type AddFoodPanelProps = {
    food: TblUserFood;
    addFood: (food: TblUserFood) => void;
    className?: string;
};

export function AddFoodPanel({food, addFood, className}: AddFoodPanelProps) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const foodRef = useRef<HTMLInputElement>(null);
    const tmpFood = useMemo<TblUserFood>(() => ({...food}), [food]);
    const render = DoRender();

    useEffect(() => {
        foodRef.current?.focus();
    }, []);

    const onSaveClick = () => {
        setErrorMsg(null);

        const newFood = {...food, ...tmpFood};
        newFood.name = newFood.name.trim();
        newFood.unit = newFood.unit.trim();

        if (newFood.name === '') {
            setErrorMsg('Food cannot have empty name');
            return;
        }

        if (newFood.unit === '') {
            setErrorMsg('Food unit cannot be empty');
            return;
        }

        if (newFood.portion <= 0) {
            setErrorMsg('Food portion must be a positive number');
            return;
        }

        addFood(newFood);
    };

    return (
        <div className={`rounded-sm p-2 border container-theme bg-c-black ${className}`}>
            <span className="text-lg font-bold">Create New Food</span>
            <ErrorDiv errorMsg={errorMsg} />
            <div className="flex justify-between font-semibold">
                <div className="w-full">
                    <div className="flex flex-row flex-wrap">
                        <input
                            ref={foodRef}
                            className="mb-2 whitespace-nowrap flex-auto mr-1"
                            type="text"
                            value={tmpFood.name}
                            onInput={(e) => (tmpFood.name = e.currentTarget.value)}
                            placeholder="Food Name"
                        />
                        <input
                            className="mb-2 whitespace-nowrap flex-auto max-w-32"
                            type="text"
                            value={tmpFood.unit}
                            onInput={(e) => (tmpFood.unit = e.currentTarget.value)}
                            placeholder="Portion Unit"
                        />
                    </div>
                    <NumberInput
                        className={'w-full mb-1'}
                        innerClassName={'w-full'}
                        min={0}
                        label={'Portion'}
                        value={tmpFood.portion}
                        onValueChange={(portion: number) => {
                            tmpFood.portion = portion;
                            render();
                        }}
                    />
                </div>
            </div>

            <div className="w-full flex flex-wrap flex-col sm:flex-row sm:justify-evenly justify-end">
                <NumberInput
                    className="my-1 sm:mr-1 flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Fat'}
                    min={0}
                    value={tmpFood.fat}
                    onValueChange={(fat: number) => {
                        tmpFood.fat = fat;
                        render();
                    }}
                />
                <NumberInput
                    className="my-1 sm:mx-1 flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Carb'}
                    min={0}
                    value={tmpFood.carb}
                    onValueChange={(carb: number) => {
                        tmpFood.carb = carb;
                        render();
                    }}
                />
                <NumberInput
                    className="my-1 sm:mx-1 flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Fibre'}
                    min={0}
                    value={tmpFood.fibre}
                    onValueChange={(fibre: number) => {
                        tmpFood.fibre = fibre;
                        render();
                    }}
                />
                <NumberInput
                    className="my-1 sm:mx-1 flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Protein'}
                    min={0}
                    value={tmpFood.protein}
                    onValueChange={(protein: number) => {
                        tmpFood.protein = protein;
                        render();
                    }}
                />
                <button className="ml-auto my-1 sm:ml-1 bg-c-green font-bold w-full max-w-32" onClick={onSaveClick}>
                    Create Food
                </button>
            </div>
        </div>
    );
}
