import {Dispatch, StateUpdater, useCallback, useState} from 'preact/hooks';

import {BaseState} from '../../state/basestate';
import {TblUserFood} from '../../api/types';
import {ApiUpdateUserFood, ApiNewUserFood, ApiDeleteUserFood} from '../../api/api';
import {FoodEditPanel} from './food_edit_panel';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {JSX} from 'preact/jsx-runtime';
import {AddFoodPanel} from './add_food_panel';
import {TblUserFoodFactory} from '../../api/factories';
import {NumberInput} from '../../components/number_input';
import {FoodBuilderPanel} from './food_builder_panel';
import {GetErrorHandler} from '../../utils/error';

export const FoodPage = (state: BaseState) => {
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [search, setSearch] = useState<string>('');
    const [showAddFoodPanel, setShowAddFoodPanel] = useState<boolean>(false);
    const [showBuildFoodPanel, setShowBuildFoodPanel] = useState<boolean>(false);
    const [numberToShow, setNumberToShow] = useState<number>(15);
    const [baseFood, setBaseFood] = useState<TblUserFood>(TblUserFoodFactory.empty());

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleErr = useCallback(GetErrorHandler(setErrorMsg, state.doRefresh), [state.doRefresh]);

    const addNewFood = (setPanelState: Dispatch<StateUpdater<boolean>>, food: TblUserFood) => {
        ApiNewUserFood(food)
            .then((newFood) => {
                const foods = [...state.foods, ...[newFood]];
                foods.sort((a, b) => a.name.localeCompare(b.name));
                state.setFoods(foods);
                setPanelState(false);
            })
            .catch(handleErr);
    };

    const deleteFood = (food: TblUserFood) => {
        if (confirm('Delete this food?')) {
            ApiDeleteUserFood(food)
                .then(() => {
                    const foods = state.foods.filter((x) => x.id !== food.id);
                    state.setFoods(foods);
                })
                .catch(handleErr);
        }
    };

    const updateFood = (food: TblUserFood) => {
        ApiUpdateUserFood(food)
            .then(() => {
                const foods = [...state.foods];
                for (let i = 0; i < foods.length; i++) {
                    if (foods[i].id === food.id) {
                        if (food.portion !== 1) {
                            food.protein /= food.portion;
                            food.carb /= food.portion;
                            food.fibre /= food.portion;
                            food.fat /= food.portion;
                            food.portion = 1;
                        }
                        foods[i] = food;
                        break;
                    }
                }
                foods.sort((a, b) => a.name.localeCompare(b.name));
                state.setFoods(foods);
            })
            .catch(handleErr);
    };

    const searchChange = (e: JSX.TargetedEvent<HTMLInputElement, Event>) => {
        setSearch(e.currentTarget.value.toLowerCase());
    };

    return (
        <>
            <div className="flex justify-evenly my-4">
                <button
                    disabled={showAddFoodPanel}
                    className="w-24"
                    onClick={() => {
                        setShowAddFoodPanel(true);
                        setBaseFood(TblUserFoodFactory.empty());
                    }}
                >
                    New Food
                </button>
                <button
                    disabled={showBuildFoodPanel}
                    className="w-24"
                    onClick={() => {
                        setShowBuildFoodPanel(true);
                    }}
                >
                    Build Food
                </button>
                <NumberInput label={'Show'} min={1} step={5} value={numberToShow} onValueChange={setNumberToShow} />
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showAddFoodPanel && (
                <AddFoodPanel
                    className="mb-4"
                    food={baseFood}
                    dataSources={state.dataSources}
                    addFood={(f) => addNewFood(setShowAddFoodPanel, f)}
                    onCancel={() => setShowAddFoodPanel(false)}
                    doRefresh={state.doRefresh}
                />
            )}

            {showBuildFoodPanel && (
                <FoodBuilderPanel
                    className="mb-4"
                    user={state.user}
                    foods={state.foods}
                    addFood={(f) => addNewFood(setShowBuildFoodPanel, f)}
                    onCancel={() => setShowBuildFoodPanel(false)}
                />
            )}
            <div className="flex justify-evenly mb-4">
                <input onInput={searchChange} className="w-full" type="text" placeholder="search" />
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
                {state.foods.length === 0 ? (
                    <div className="text-center font-bold py-32">
                        The list is empty.
                        <br />
                        Try giving it some food!
                    </div>
                ) : (
                    state.foods
                        .filter((x: TblUserFood) => {
                            return x.name.toLowerCase().includes(search);
                        })
                        .slice(0, numberToShow)
                        .map((food: TblUserFood) => {
                            return (
                                <FoodEditPanel
                                    key={food.id}
                                    user={state.user}
                                    food={food}
                                    deleteFood={deleteFood}
                                    updateFood={updateFood}
                                    copyFood={(foodToCopy: TblUserFood) => {
                                        setShowAddFoodPanel(true);
                                        setBaseFood(foodToCopy);
                                        window.scrollTo({top: 0, behavior: 'smooth'});
                                    }}
                                />
                            );
                        })
                )}
            </div>
        </>
    );
};
