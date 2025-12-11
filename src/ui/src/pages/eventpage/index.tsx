import {useRef, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {CreateUserEventLog, TblUser, TblUserFoodLog, UserEventLogWithFoodLog} from '../../api/types';
import {ApiNewEventLog} from '../../api/api';
import {formatSmartTimestamp} from '../../utils/date_utils';
import {DropdownButton, DropdownButtonAction} from '../../components/drop_down_button';
import {DownloadData, GenerateEventTableText} from '../../utils/download';
import {AddEventsPanel} from './add_event_panel';
import {UserEventLogWithFoodLogFactory} from '../../api/factories';
import {NumberInput} from '../../components/number_input';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';
import {Fragment} from 'preact/jsx-runtime';
import {DoRender} from '../../hooks/doRender';

export function EventsPage(state: BaseState) {
    const [showNewEventPanel, setShowNewEventPanel] = useState<boolean>(false);
    const [numberToShow, setNumberToShow] = useState<number>(15);
    const [newEvent, setNewEvent] = useState<UserEventLogWithFoodLog>(UserEventLogWithFoodLogFactory.empty());
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const onCreateEvent = (eventlog: CreateUserEventLog) => {
        ApiNewEventLog(eventlog)
            .then((newEventlog: UserEventLogWithFoodLog) => {
                state.setEventlog((e) => [newEventlog.eventlog, ...(e === null ? [] : e)]);
                state.setEventLogs((e) => [newEventlog, ...(e === null ? [] : e)]);
                setNewEvent(UserEventLogWithFoodLogFactory.empty());
                setShowNewEventPanel(false);
                setErrorMsg(null);
            })
            .catch((e: Error) => setErrorMsg(e.message));
    };

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button
                    className={`w-24 ${showNewEventPanel && 'bg-c-l-red'}`}
                    onClick={() => {
                        setShowNewEventPanel((x) => !x);
                        setNewEvent(UserEventLogWithFoodLogFactory.empty());
                    }}
                >
                    {!showNewEventPanel ? 'New Event' : 'Cancel'}
                </button>

                <NumberInput
                    label={'Show Last'}
                    min={1}
                    step={5}
                    value={numberToShow}
                    onValueChange={setNumberToShow}
                    numberList={[1, 2, 5, 10, 20, 50]}
                />

                <DropdownButton
                    buttonClassName="w-full h-full"
                    className="w-24"
                    label="Export"
                    actions={[
                        {
                            label: 'As Text Render',
                            onClick: () => {
                                const blob = new Blob([GenerateEventTableText(state.eventlogs)], {
                                    type: 'text/plain; charset=utf-8',
                                });
                                DownloadData(blob, 'eventlogs.txt');
                            },
                        },
                        {
                            label: 'As JSON',
                            onClick: () => {
                                const jsonStr = JSON.stringify(state.eventlogs, null, 2);
                                const blob = new Blob([jsonStr], {type: 'application/json'});
                                DownloadData(blob, 'eventlogs.json');
                            },
                        },
                    ]}
                />
            </div>

            {errorMsg !== null && <div className="text-c-l-red">{errorMsg}</div>}
            {showNewEventPanel && (
                <>
                    <AddEventsPanel
                        user={state.user}
                        foods={state.foods}
                        events={state.events}
                        fromEvent={newEvent}
                        createEvent={onCreateEvent}
                    />
                </>
            )}

            <div className={`w-full space-y-4 ${showNewEventPanel && 'mt-4'}`}>
                {state.eventlogs.length === 0 && (
                    <div className="text-center font-bold">
                        Shhh… the list is taking a nap right now.
                        <br /> Try adding something to wake it up!
                    </div>
                )}
                {state.eventlogs.slice(0, numberToShow).map((foodGroup: UserEventLogWithFoodLog) => (
                    <EventPanel
                        key={foodGroup.eventlog.id}
                        user={state.user}
                        foodGroup={foodGroup}
                        actions={[
                            {
                                label: 'Copy',
                                onClick: () => {
                                    setNewEvent({...foodGroup});
                                    setShowNewEventPanel(true);
                                    window.scrollTo({top: 0, behavior: 'smooth'});
                                },
                            },
                            {label: 'Edit', onClick: () => {}},
                            {label: 'Delete', onClick: () => {}},
                        ]}
                    />
                ))}
            </div>
        </>
    );
}

interface EventPanelState {
    user: TblUser;
    foodGroup: UserEventLogWithFoodLog;
    actions: DropdownButtonAction[];
}
export function EventPanel({user, foodGroup, actions}: EventPanelState) {
    const [curRow, setCurRow] = useState<number>(-1);

    return (
        <>
            <div className="w-full p-2 border container-theme">
                <div className="flex flex-row flex-wrap w-full justify-between align-middle">
                    <span className="text-s font-semibold">{`${foodGroup.eventlog.event} `}</span>
                    <span className=" text-s font-semibold">{formatSmartTimestamp(foodGroup.eventlog.user_time)}</span>
                    <DropdownButton actions={actions} />
                </div>

                <div className="flex flex-row flex-wrap w-full justify-evenly">
                    <span className="">{`BloodSugar ${foodGroup.eventlog.blood_glucose.toFixed(1)}`}</span>
                    <span className="mx-1">{`Insulin ${foodGroup.eventlog.actual_insulin_taken.toFixed(1)}`}</span>
                    <span>
                        {`Callories ${CalculateCalories(
                            foodGroup.total_protein,
                            foodGroup.total_carb,
                            foodGroup.total_fibre,
                            foodGroup.total_fat,
                            Str2CalorieFormula(user.caloric_calc_method)
                        ).toFixed(1)}`}
                    </span>
                </div>

                {foodGroup.foodlogs.length > 0 && (
                    <div className="w-full mt-2 overflow-x-scroll">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="text-xs border-b">
                                    <th className="font-normal text-left py-1"> </th>
                                    <th className="font-normal text-right py-1 pr-2" title="Amount">
                                        Amt
                                    </th>
                                    <th className="font-normal text-right py-1 pr-2" title="Protein">
                                        Prot
                                    </th>
                                    <th className="font-normal text-right py-1 pr-2" title="Carbs">
                                        Carb
                                    </th>
                                    <th className="font-normal text-right py-1 pr-2" title="Fibre">
                                        Fib
                                    </th>
                                    <th className="font-normal text-right py-1 pr-2" title="Fat">
                                        Fat
                                    </th>
                                    <th className="font-normal text-right py-1" title="Net Carbs">
                                        Net
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {foodGroup.foodlogs.length > 1 && (
                                    <tr>
                                        <td className="whitespace-nowrap">Total</td>
                                        <td className="text-center">-</td>
                                        <td className="text-right pr-2">{foodGroup.total_protein.toFixed(1)}</td>
                                        <td className="text-right pr-2">{foodGroup.total_carb.toFixed(1)}</td>
                                        <td className="text-right pr-2">{foodGroup.total_fibre.toFixed(1)}</td>
                                        <td className="text-right pr-2">{foodGroup.total_fat.toFixed(1)}</td>
                                        <th className="text-right">
                                            {(foodGroup.total_carb - foodGroup.total_fibre).toFixed(1)}{' '}
                                        </th>
                                    </tr>
                                )}
                                {foodGroup.foodlogs.map((food: TblUserFoodLog, i: number) => {
                                    const shown = i == curRow;
                                    const toggle = () =>  setCurRow(shown ? -1 : i) ;
                                    return (
                                        <Fragment key={food.id}>
                                            {shown && (
                                                <tr className="cursor-pointer" onClick={toggle}>
                                                    <td className="border-c-l-green border-t border-l " colSpan={7}>
                                                    <div className="mx-1">
                                                    {food.name}
                                                    </div>
                                                    </td>
                                                </tr>
                                            )}
                                            <tr onClick={toggle} className="cursor-pointer">
                                                <td className="whitespace-nowrap max-w-[100px] sm:w-full pr-2">
                                                    {!shown ? (
                                                        <div className="overflow-x-hidden">{food.name}</div>
                                                    ) : (
                                                        <div className="border-c-l-green border-b border-l w-full">
                                                        &nbsp;
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-right whitespace-nowrap pr-2">
                                                    {' '}
                                                    {food.portion} {food.unit}{' '}
                                                </td>
                                                <td className="text-right pr-2">{food.protein.toFixed(1)}</td>
                                                <td className="text-right pr-2">{food.carb.toFixed(1)}</td>
                                                <td className="text-right pr-2">{food.fibre.toFixed(1)}</td>
                                                <td className="text-right pr-2">{food.fat.toFixed(1)}</td>
                                                <td className="text-right">{(food.carb - food.fibre).toFixed(1)}</td>
                                            </tr>
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
