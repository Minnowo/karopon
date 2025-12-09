import {useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {CreateUserEventLog, TblUserFoodLog, UserEventLogWithFoodLog} from '../../api/types';
import {LogEvent} from '../../api/api';
import {formatSmartTimestamp} from '../../utils/date_utils';
import {DropdownButton} from '../../components/drop_down_button';
import {DownloadData, GenerateEventTableText} from '../../utils/download';
import {AddEventsPanel} from './add_event_panel';
import {UserEventLogWithFoodLogFactory} from '../../api/factories';
import {NumberInput2} from '../../components/number_input2';

export function EventsPage(state: BaseState) {
    const [showNewEventPanel, setShowNewEventPanel] = useState<boolean>(false);
    const [numberToShow, setNumberToShow] = useState<number>(15);
    const [newEvent, setNewEvent] = useState<UserEventLogWithFoodLog>(UserEventLogWithFoodLogFactory.empty());
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const onCreateEvent = (eventlog: CreateUserEventLog) => {
        LogEvent(eventlog)
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
                    className={`w-32 ${showNewEventPanel && 'bg-c-l-red'}`}
                    onClick={() => {
                        setShowNewEventPanel((x) => !x);
                        setNewEvent(UserEventLogWithFoodLogFactory.empty());
                    }}
                >
                    {!showNewEventPanel ? 'Add New Event' : 'Cancel'}
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
                    <AddEventsPanel foods={state.foods} events={state.events} fromEvent={newEvent} createEvent={onCreateEvent} />
                </>
            )}

            <div className={`w-full space-y-4 ${showNewEventPanel && 'mt-4'}`}>
                {state.eventlogs.length === 0 && (
                    <div className="text-center font-bold p-32">
                        Shhh… the list is taking a nap right now. Try adding something to wake it up!
                    </div>
                )}
                {state.eventlogs.slice(0, numberToShow).map((foodGroup: UserEventLogWithFoodLog) => {
                    return (
                        <div key={foodGroup.eventlog.id} className="w-full p-2 border container-theme">
                            <div className="flex flex-row flex-wrap w-full justify-between align-middle">
                                <span className="text-s font-semibold">{`${foodGroup.eventlog.event} `}</span>
                                <span className=" text-s font-semibold">
                                    {formatSmartTimestamp(foodGroup.eventlog.user_time)}
                                </span>
                                <DropdownButton
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
                            </div>
                            <div className="flex flex-row flex-wrap w-full justify-evenly">
                                <span className="whitespace-nowrap">{`Blood Sugar: ${foodGroup.eventlog.blood_glucose}`}</span>
                                <span className="whitespace-nowrap">
                                    {`Insulin Taken: ${foodGroup.eventlog.actual_insulin_taken}`}
                                </span>
                            </div>

                            {foodGroup.foodlogs.length > 0 && (
                                <div className="w-full mt-2 overflow-x-scroll">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="font-semibold text-xs border-b">
                                                <th className="text-left py-1"> </th>
                                                <th className="text-right py-1 pr-1">Amount</th>
                                                <th className="text-right py-1 pr-1">Protein</th>
                                                <th className="text-right py-1 pr-1">Carbs</th>
                                                <th className="text-right py-1 pr-1">Fibre</th>
                                                <th className="text-right py-1 pr-1">Fat</th>
                                                <th className="text-right py-1">NetCarbs</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {foodGroup.foodlogs.length > 1 && (
                                                <tr>
                                                    <td className="whitespace-nowrap">Total</td>
                                                    <td className="text-right">-</td>
                                                    <td className="text-right pr-1">{foodGroup.total_protein.toFixed(1)}</td>
                                                    <td className="text-right pr-1">{foodGroup.total_carb.toFixed(1)}</td>
                                                    <td className="text-right pr-1">{foodGroup.total_fibre.toFixed(1)}</td>
                                                    <td className="text-right pr-1">{foodGroup.total_fat.toFixed(1)}</td>
                                                    <th className="text-right">
                                                        {' '}
                                                        {(foodGroup.total_carb - foodGroup.total_fibre).toFixed(1)}{' '}
                                                    </th>
                                                </tr>
                                            )}
                                            {foodGroup.foodlogs.map((food: TblUserFoodLog) => (
                                                <tr key={food.id}>
                                                    <td className="whitespace-nowrap max-w-[150px] pr-1">
                                                        <div className="overflow-x-scroll">{food.name}</div>
                                                    </td>
                                                    <td className="text-right whitespace-nowrap pr-1">
                                                        {food.portion} {food.unit}
                                                    </td>
                                                    <td className="text-right pr-1">{food.protein.toFixed(1)}</td>
                                                    <td className="text-right pr-1">{food.carb.toFixed(1)}</td>
                                                    <td className="text-right pr-1">{food.fibre.toFixed(1)}</td>
                                                    <td className="text-right pr-1">{food.fat.toFixed(1)}</td>
                                                    <td className="text-right">{(food.carb - food.fibre).toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}
