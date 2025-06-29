
import {useState, useRef} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {TblUserFood} from '../../api/types';
import { UpdateUserFood } from '../../api/api';
import {NumberInput} from '../../components/numberinput';
import {MouseEvent } from 'preact/compat';

type FoodEditPanelProps = {

    food: TblUserFood;
    updateFood: (food:TblUserFood)=>void;
};

export function FoodEditPanel({food, updateFood} : FoodEditPanelProps) {

    const tmpFood = useRef<TblUserFood>({} as TblUserFood);
    const foodName = useRef<HTMLInputElement>(null);
    const foodUnit = useRef<HTMLInputElement>(null);
    const [showUpdatePanel, setShowUpdatePanel] = useState<boolean>(false);

    const onCancelClick = (_: MouseEvent<HTMLButtonElement>) => {
        setShowUpdatePanel( false );
    };
    const onSaveClick = (_: MouseEvent<HTMLButtonElement>) => {
        const newFood = { ...food, ...tmpFood.current };
        if(foodName.current?.value) {
            newFood.name = foodName.current.value;
        }
        if(foodUnit.current?.value) {
            newFood.unit = foodUnit.current.value;
        }
        updateFood(newFood);
        setShowUpdatePanel(false);
    };
    const onEditClicked = (_: MouseEvent<HTMLButtonElement>) => {
        setShowUpdatePanel( ! showUpdatePanel );
    };

    return (
        <div key={food.id} className="rounded-sm p-2 border border-c-yellow">
            <div className="flex justify-between font-semibold mb-2">

                { showUpdatePanel ?
                    <div class="w-full px-1">
                <input class="mb-2 whitespace-nowrap w-full" type="text" ref={foodName} value={food.name} />
                <input class="mb-2 whitespace-nowrap w-full" type="text" ref={foodUnit} value={food.unit} />
                    <NumberInput
                        class={"whitespace-nowrap"}
                        label={"Portion"}
                        value={food.portion}
                        onChange={ (portion:number)=> tmpFood.current.portion = portion }
                    />
                    </div>
                    :
                <div>
                    <span>
                    {food.name}
                    </span>
                    <span>
                    {' '}
                    {food.portion} {food.unit}{' '}
                    </span>
                </div>
                }

                { showUpdatePanel ?
                    <div class="text-right pl-1">
                        <button class="w-full mb-2" onClick={onCancelClick} >Cancel</button>
                        <button class="w-full" onClick={onSaveClick} >Save</button>
                    </div>
                    :
                    <div>
                    <button onClick={onEditClicked} > Edit </button>
                    </div>
                }
            </div>

        { showUpdatePanel ?
            <div className="flex flex-wrap">
                <NumberInput
                class={"mx-1 whitespace-nowrap"}
                label={"Carb"}
                value={food.carb}
                onChange={ (carb: number) =>  tmpFood.current.carb=carb  }
                />
                <NumberInput
                class={"mx-1 whitespace-nowrap"}
                label={"Protein"}
                value={food.protein}
                onChange={ (protein: number) =>  tmpFood.current.protein=protein }
                />
                <NumberInput
                class={"mx-1 whitespace-nowrap"}
                label={"Fibre"}
                value={food.fibre}
                onChange={ (fibre: number) =>  tmpFood.current.fibre=fibre }
                />
                <NumberInput
                class={"mx-1 whitespace-nowrap"}
                label={"Fat"}
                value={food.fat}
                onChange={ (fat: number) => tmpFood.current.fat=fat }
                />
                </div>
            :
            <div className="flex flex-wrap">
                <span class="mx-1 whitespace-nowrap">{food.carb} Carb </span>
                <span class="mx-1 whitespace-nowrap">{food.protein} Protein </span>
                <span class="mx-1 whitespace-nowrap">{food.fibre} Fibre </span>
                <span class="mx-1 whitespace-nowrap">{food.fat} Fat </span>
            </div>
        }

        </div>
    );
}

export function FoodPage(state: BaseState) {

    const [errorMsg, setErrorMsg] = useState<string|null>(null);

    const updateFood = (food: TblUserFood) => {
        UpdateUserFood(food).then(ok => {
            if(!ok ) {
                setErrorMsg("failed to update food");
            } else {
                const foods = [ ...state.foods ];
                for(let i =  0 ; i < foods.length; i++ ){
                    if(foods[i].id === food.id) {
                        foods[i] = food;
                        break;
                    }
                }
                state.setFoods( foods );
            }
        })
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-4">

            { errorMsg ? errorMsg : null }
            <div className="w-full space-y-4">
                {state.foods.map((food: TblUserFood) => {
                    return (
                        <FoodEditPanel key={food.id} food={food} updateFood={updateFood} />
                    );
                })}
            </div>
        </div>
    );
}
