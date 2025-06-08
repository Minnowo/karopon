import { useEffect, useState } from "preact/hooks";
import { BaseState } from "../../state/basestate";
import { TblUserFoodLog, TblUserFood } from "../../api/types";
import { GetUserFoodLog } from "../../api/api";
import { FoodInput } from "./foodinput";
import { FuzzySearch } from "../../components/select_list";

export function ListPage(state: BaseState) {
    const [foodlog, setFoodlog] = useState<Array<TblUserFoodLog> | null>(null);

    useEffect(() => {
        GetUserFoodLog().then((r) => setFoodlog(r));
    }, []);

    if (foodlog === null) {
        return <div class="">loading...</div>;
    }

    return (
        <div class="flex flex-col items-center justify-center ">
            <FoodInput foods={state.foods} />

            <table class="table-bordered table-padded">
                <thead>
                    <tr>
                        <td> Time</td>
                        <td> Food </td>
                        <td> Event </td>
                        <td> Unit</td>
                        <td> Portion</td>
                        <td> Carb</td>
                        <td> Protein</td>
                        <td> Fibre</td>
                        <td> Fat</td>
                    </tr>
                </thead>
                <tbody>
                    {foodlog.map((food: TblUserFoodLog) => {
                        return (
                            <tr key={food.id}>
                                <td> {food.user_time}</td>
                                <td> {food.name} </td>
                                <td> {food.event} </td>
                                <td> {food.unit}</td>
                                <td> {food.portion}</td>
                                <td> {food.carb}</td>
                                <td> {food.protein}</td>
                                <td> {food.fibre}</td>
                                <td> {food.fat}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
