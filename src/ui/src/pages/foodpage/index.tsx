import {Dispatch, StateUpdater, useCallback, useState} from 'preact/hooks';

import {BaseState} from '../../state/basestate';
import {TblUserFood} from '../../api/types';
import {ApiUpdateUserFood, ApiNewUserFood, ApiDeleteUserFood} from '../../api/api';
import {FoodEditPanel} from './food_edit_panel';
import {ErrorDiv} from '../../components/error_div';
import {JSX} from 'preact/jsx-runtime';
import {AddFoodPanel} from './add_food_panel';
import {DropdownButton} from '../../components/drop_down_button';
import {DownloadData} from '../../utils/download';
import {encodeCSVField} from '../../utils/csv';
import {TblUserFoodFactory} from '../../api/factories';
import {NumberInput} from '../../components/number_input';
import {FoodBuilderPanel} from './food_builder_panel';
import {GetErrorHandler} from '../../utils/error';

export function FoodPage(state: BaseState) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
            <div className="w-full flex justify-evenly my-4">
                <button
                    className={`w-24 ${showAddFoodPanel && 'bg-c-l-red font-bold'}`}
                    onClick={() => {
                        setShowAddFoodPanel((x) => !x);
                        setBaseFood(TblUserFoodFactory.empty());
                    }}
                >
                    {!showAddFoodPanel ? 'New Food' : 'Cancel'}
                </button>
                <button
                    className={`w-24 ${showBuildFoodPanel && 'bg-c-l-red font-bold'}`}
                    onClick={() => {
                        setShowBuildFoodPanel((x) => !x);
                    }}
                >
                    {!showBuildFoodPanel ? 'Build Food' : 'Cancel'}
                </button>
                <NumberInput label={'Show'} min={1} step={5} value={numberToShow} onValueChange={setNumberToShow} />
                <DropdownButton
                    buttonClassName="w-full h-full"
                    className="w-24"
                    label="Export"
                    actions={[
                        {
                            label: 'As CSV',
                            onClick: () => {
                                const headers = Object.keys(state.foods[0]) as Array<keyof TblUserFood>;
                                const csvRows: string[] = [];

                                csvRows.push(headers.join(','));

                                for (const item of state.foods) {
                                    csvRows.push(headers.map((key) => encodeCSVField(String(item[key]))).join(','));
                                }

                                const csvContent = csvRows.join('\n');
                                const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
                                DownloadData(blob, 'foods.csv');
                            },
                        },
                        {
                            label: 'As JSON',
                            onClick: () => {
                                const jsonStr = JSON.stringify(state.foods, null, 2);
                                const blob = new Blob([jsonStr], {type: 'application/json'});
                                DownloadData(blob, 'foods.json');
                            },
                        },
                    ]}
                />
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showAddFoodPanel && (
                <AddFoodPanel
                    className="mb-4"
                    food={baseFood}
                    dataSources={state.dataSources}
                    addFood={(f) => addNewFood(setShowAddFoodPanel, f)}
                />
            )}

            {showBuildFoodPanel && (
                <FoodBuilderPanel
                    className="mb-4"
                    user={state.user}
                    foods={state.foods}
                    addFood={(f) => addNewFood(setShowBuildFoodPanel, f)}
                />
            )}
            <div className="w-full flex justify-evenly mb-4">
                <input onInput={searchChange} className="w-full" type="text" placeholder="search" />
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-full space-y-4">
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
            </div>
        </>
    );
}
