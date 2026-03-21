import {useState} from 'preact/hooks';
import {TblUser, TblUserFoodLog, UserEventFoodLog} from '../../api/types';
import {DropdownButton, DropdownButtonAction} from '../../components/drop_down_button';
import {FormatSmartTimestamp} from '../../utils/date_utils';
import {Fragment} from 'preact/jsx-runtime';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';

type EventPanelState = {
    user: TblUser;
    foodGroup: UserEventFoodLog;
    actions: DropdownButtonAction[];
};
export const EventPanel = ({user, foodGroup, actions}: EventPanelState) => {
    const [curRow, setCurRow] = useState<number>(-1);

    return (
        <div className="container-theme">
            <div className="flex flex-wrap justify-between align-middle">
                <span className="text-s font-semibold">{`${foodGroup.eventlog.event} `}</span>
                <span className=" text-s font-semibold">{FormatSmartTimestamp(foodGroup.eventlog.user_time)}</span>
                <DropdownButton actions={actions} />
            </div>

            {user.show_diabetes && (
                <div className="flex flex-wrap w-full justify-evenly gap-2">
                    <span title="Blood Glucose Level (Blood Sugar)">{`BGL ${foodGroup.eventlog.blood_glucose.toFixed(1)}`}</span>
                    <span title="Insulin to Carb Ratio">{`ITCR ${foodGroup.eventlog.insulin_to_carb_ratio.toFixed(1)}`}</span>
                    <span title="Insulin Recommended">{`InsRec ${foodGroup.eventlog.recommended_insulin_amount.toFixed(1)}`}</span>
                    <span title="Insulin Taken">{`InsTaken ${foodGroup.eventlog.actual_insulin_taken.toFixed(1)}`}</span>
                </div>
            )}

            {foodGroup.foodlogs.length > 0 && (
                <div className="w-full mt-2 overflow-x-scroll">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="text-xs text-right font-semibold">
                                <th className="text-left py-1"> </th>
                                <th className="py-1 pr-2" title="Amount">
                                    Amt
                                </th>
                                <th className="py-1 pr-2" title="Fat">
                                    Fat
                                </th>
                                <th className="py-1 pr-2" title="Carbs">
                                    Carb
                                </th>
                                <th className="py-1 pr-2" title="Fibre">
                                    Fib
                                </th>
                                <th className="py-1 pr-2" title="Protein">
                                    Prot
                                </th>
                                <th className="py-1 pr-2" title="Net Carbs">
                                    Net
                                </th>
                                <th className="py-1" title="Calories">
                                    Cal
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {foodGroup.foodlogs.length > 1 && (
                                <tr>
                                    <td className="wsnw">Total</td>
                                    <td className="text-center">-</td>
                                    <td className="text-right pr-2">{foodGroup.total_fat.toFixed(1)}</td>
                                    <td className="text-right pr-2">{foodGroup.total_carb.toFixed(1)}</td>
                                    <td className="text-right pr-2">{foodGroup.total_fibre.toFixed(1)}</td>
                                    <td className="text-right pr-2">{foodGroup.total_protein.toFixed(1)}</td>
                                    <th className="text-right pr-2">
                                        {(foodGroup.total_carb - foodGroup.total_fibre).toFixed(1)}
                                    </th>
                                    <td className="text-right">
                                        {CalculateCalories(
                                            foodGroup.total_protein,
                                            foodGroup.total_carb - foodGroup.total_fibre,
                                            foodGroup.total_fibre,
                                            foodGroup.total_fat,
                                            Str2CalorieFormula(user.caloric_calc_method)
                                        ).toFixed(0)}
                                    </td>
                                </tr>
                            )}
                            {foodGroup.foodlogs.map((food: TblUserFoodLog, i: number) => {
                                const shown = i === curRow;
                                const toggle = () => setCurRow(shown ? -1 : i);
                                return (
                                    <Fragment key={food.id}>
                                        {shown && (
                                            <tr className="cursor-pointer" onClick={toggle}>
                                                <td className="border-c-accent2 border-t-2 border-l-2 " colSpan={8}>
                                                    <div className="mx-1">{food.name}</div>
                                                </td>
                                            </tr>
                                        )}
                                        <tr onClick={toggle} className="cursor-pointer">
                                            <td
                                                className={`wsnw max-w-[100px] sm:w-full pr-2 ${shown ? 'border-b-2 border-l-2 border-c-accent2' : ''} `}
                                            >
                                                {!shown ? (
                                                    <div className="overflow-x-hidden">{food.name}</div>
                                                ) : (
                                                    <div className="w-full">&nbsp;</div>
                                                )}
                                            </td>
                                            <td className="text-right wsnw pr-2">
                                                {' '}
                                                {food.portion} {food.unit}{' '}
                                            </td>
                                            <td className="text-right pr-2">{food.fat.toFixed(1)}</td>
                                            <td className="text-right pr-2">{food.carb.toFixed(1)}</td>
                                            <td className="text-right pr-2">{food.fibre.toFixed(1)}</td>
                                            <td className="text-right pr-2">{food.protein.toFixed(1)}</td>
                                            <td className="text-right pr-2">{(food.carb - food.fibre).toFixed(1)}</td>
                                            <td className="text-right">
                                                {CalculateCalories(
                                                    food.protein,
                                                    food.carb - food.fibre,
                                                    food.fibre,
                                                    food.fat,
                                                    Str2CalorieFormula(user.caloric_calc_method)
                                                ).toFixed(0)}
                                            </td>
                                        </tr>
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
