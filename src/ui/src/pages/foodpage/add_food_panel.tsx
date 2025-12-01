import {useState, useRef, useEffect} from 'preact/hooks';
import {TblUserFood} from '../../api/types';
import {NumberInput2} from '../../components/number_input2';

type AddFoodPanelProps = {
    food: TblUserFood;
    addFood: (food: TblUserFood) => void;
    onCancelClick?: () => void;
    className?: string;
};

export function AddFoodPanel({food, addFood, className, onCancelClick}: AddFoodPanelProps) {
    const tmpFood = useRef<TblUserFood>({...food});
    const foodName = useRef<HTMLInputElement>(null);
    const foodUnit = useRef<HTMLInputElement>(null);

    const [, setRender] = useState<number>(0);

    const render = () => setRender((x) => x + 1);

    useEffect(() => {
        tmpFood.current = food;
        render();
    }, [food]);

    const onSaveClick = () => {
        const newFood = {...food, ...tmpFood.current};
        if (foodName.current?.value) {
            newFood.name = foodName.current.value;
        }
        if (foodUnit.current?.value) {
            newFood.unit = foodUnit.current.value;
        }
        addFood(newFood);
    };

    return (
        <div key={food.id} className={`rounded-sm p-2 border container-theme bg-c-black ${className}`}>
            <span className="text-lg font-bold">Create New Food</span>
            <div className="flex justify-between font-semibold">
                <div className="w-full">
                    <div className="flex flex-row flex-wrap">
                        <input
                            className="mb-2 whitespace-nowrap flex-auto mr-1"
                            type="text"
                            ref={foodName}
                            value={food.name}
                            onInput={(e) => (tmpFood.current.name = e.currentTarget.value)}
                            placeholder="Food Name"
                        />
                        <input
                            className="mb-2 whitespace-nowrap flex-auto max-w-32"
                            type="text"
                            ref={foodUnit}
                            value={food.unit}
                            onInput={(e) => (tmpFood.current.unit = e.currentTarget.value)}
                            placeholder="Portion Unit"
                        />
                    </div>
                    <NumberInput2
                        className={'w-full mb-1'}
                        innerClassName={'w-full'}
                        min={0}
                        max={1_000_000_000}
                        numberList={[1, 2, 5, 10, 50, 100, 200]}
                        label={'Portion'}
                        value={tmpFood.current.portion}
                        onValueChange={(portion: number) => {
                            tmpFood.current.portion = portion;
                            render();
                        }}
                    />
                </div>
            </div>

            <div className="w-full flex flex-wrap flex-col sm:flex-row sm:justify-evenly justify-end">
                <NumberInput2
                    className="my-1 sm:mr-1 flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Protein'}
                    min={0}
                    numberList={[1, 2, 5, 10, 20, 30, 50, 100, 200]}
                    value={tmpFood.current.protein}
                    onValueChange={(protein: number) => {
                        tmpFood.current.protein = protein;
                        render();
                    }}
                />
                <NumberInput2
                    className="my-1 sm:mx-1 flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Carb'}
                    min={0}
                    numberList={[1, 2, 5, 10, 20, 30, 50, 100, 200]}
                    value={tmpFood.current.carb}
                    onValueChange={(carb: number) => {
                        tmpFood.current.carb = carb;
                        render();
                    }}
                />
                <NumberInput2
                    className="my-1 sm:mx-1 flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Fibre'}
                    min={0}
                    numberList={[1, 2, 5, 10, 20, 30, 50, 100]}
                    value={tmpFood.current.fibre}
                    onValueChange={(fibre: number) => {
                        tmpFood.current.fibre = fibre;
                        render();
                    }}
                />
                <NumberInput2
                    className="my-1 sm:mx-1 flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Fat'}
                    min={0}
                    numberList={[1, 2, 5, 10, 20, 30, 50, 100]}
                    value={tmpFood.current.fat}
                    onValueChange={(fat: number) => {
                        tmpFood.current.fat = fat;
                        render();
                    }}
                />
                <button className="my-1 sm:ml-1 text-c-l-green max-w-32" onClick={onSaveClick}>
                    Create Food
                </button>
            </div>
        </div>
    );
}
