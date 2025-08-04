import {useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {TblUserFood} from '../../api/types';
import {UpdateUserFood} from '../../api/api';
import {FoodEditPanel} from '../../components/food_edit_panel';
import {ErrorDiv} from '../../components/error_div';

export function FoodPage(state: BaseState) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const updateFood = (food: TblUserFood) => {
        UpdateUserFood(food)
            .then(() => {
                const foods = [...state.foods];
                for (let i = 0; i < foods.length; i++) {
                    if (foods[i].id === food.id) {
                        foods[i] = food;
                        break;
                    }
                }
                state.setFoods(foods);
            })
            .catch((err: Error) => setErrorMsg(err.message));
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-4">
            <ErrorDiv errorMsg={errorMsg} />

            <div className="w-full space-y-4">
                {state.foods.map((food: TblUserFood) => {
                    return <FoodEditPanel key={food.id} food={food} updateFood={updateFood} />;
                })}
            </div>
        </div>
    );
}
