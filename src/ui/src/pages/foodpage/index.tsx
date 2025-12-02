import {useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {TblUserFood} from '../../api/types';
import {UpdateUserFood, NewUserFood, DeleteUserFood} from '../../api/api';
import {FoodEditPanel} from './food_edit_panel';
import {ErrorDiv} from '../../components/error_div';
import {JSX} from 'preact/jsx-runtime';
import {AddFoodPanel} from './add_food_panel';
import {DropdownButton} from '../../components/drop_down_button';
import {DownloadData} from '../../utils/download';
import {encodeCSVField} from '../../utils/csv';
import {TblUserFoodFactory} from '../../api/factories';
import {NumberInput2} from '../../components/number_input2';

export function FoodPage(state: BaseState) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [search, setSearch] = useState<string>('');
    const [showAddFoodPanel, setShowAddFoodPanel] = useState<boolean>(false);
    const [numberToShow, setNumberToShow] = useState<number>(15);
    const [baseFood, setBaseFood] = useState<TblUserFood>(TblUserFoodFactory.empty());

    const addNewFood = (food: TblUserFood) => {
        NewUserFood(food)
            .then((newFood) => {
                const foods = [...state.foods, ...[newFood]];
                foods.sort((a, b) => a.name.localeCompare(b.name));
                state.setFoods(foods);
                setShowAddFoodPanel(false);
            })
            .catch((err: Error) => setErrorMsg(err.message));
    };
    const deleteFood = (food: TblUserFood) => {
        DeleteUserFood(food)
            .then(() => {
                const foods = state.foods.filter((x) => x.id != food.id);
                state.setFoods(foods);
            })
            .catch((err: Error) => setErrorMsg(err.message));
    };

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
                foods.sort((a, b) => a.name.localeCompare(b.name));
                state.setFoods(foods);
            })
            .catch((err: Error) => setErrorMsg(err.message));
    };

    const searchChange = (e: JSX.TargetedEvent<HTMLInputElement, Event>) => {
        setSearch(e.currentTarget.value.toLowerCase());
    };

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button
                    className={`w-32 ${showAddFoodPanel && 'bg-c-l-red'}`}
                    onClick={() => {
                        setShowAddFoodPanel((x) => !x);
                        setBaseFood(TblUserFoodFactory.empty());
                    }}
                >
                    {!showAddFoodPanel ? 'Add New Food' : 'Cancel'}
                </button>
                <NumberInput2
                    label={'Show Last'}
                    min={1}
                    step={5}
                    value={numberToShow}
                    onValueChange={setNumberToShow}
                    numberList={[1, 2, 5, 10, 20, 50]}
                />
                <DropdownButton
                    buttonClassName="w-full h-full"
                    className="w-32"
                    label="Export"
                    actions={[
                        {
                            label: 'As CSV',
                            onClick: () => {
                                const headers = Object.keys(state.foods[0]) as (keyof TblUserFood)[];
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

            {showAddFoodPanel ? (
                <>
                    <AddFoodPanel
                        className="mb-4"
                        food={baseFood}
                        addFood={addNewFood}
                        onCancelClick={() => setShowAddFoodPanel(false)}
                    />
                </>
            ) : (
                <> </>
            )}
            <div className="w-full flex justify-evenly mb-4">
                <input onInput={searchChange} className="w-full" type="text" placeholder="search" />
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-full space-y-4">
                    {state.foods
                        .filter((x: TblUserFood) => {
                            return x.name.toLowerCase().includes(search);
                        })
                        .slice(0, numberToShow)
                        .map((food: TblUserFood) => {
                            return (
                                <FoodEditPanel
                                    key={food.id}
                                    food={food}
                                    deleteFood={deleteFood}
                                    updateFood={updateFood}
                                    copyFood={(food: TblUserFood) => {
                                        setShowAddFoodPanel(true);
                                        setBaseFood(food);
                                        window.scrollTo({top: 0, behavior: 'smooth'});
                                    }}
                                />
                            );
                        })}
                </div>
            </div>
        </>
    );
}
