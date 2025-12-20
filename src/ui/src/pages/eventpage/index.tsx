import {useEffect, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {
    CreateUserEventLog,
    TblUser,
    TblUserEventLog,
    TblUserFoodLog,
    UpdateUserEventLog,
    UserEventFoodLog,
} from '../../api/types';
import {ApiDeleteUserEventLog, ApiError, ApiNewEventLog, ApiUpdateUserEventLog} from '../../api/api';
import {formatSmartTimestamp} from '../../utils/date_utils';
import {DropdownButton, DropdownButtonAction} from '../../components/drop_down_button';
import {DownloadData, GenerateEventTableText} from '../../utils/download';
import {AddEventsPanel} from './add_event_panel';
import {UserEventFoodLogFactory} from '../../api/factories';
import {NumberInput} from '../../components/number_input';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';
import {Fragment} from 'preact/jsx-runtime';
import {ErrorDiv} from '../../components/error_div';

type EventPanelState = {
    user: TblUser;
    foodGroup: UserEventFoodLog;
    actions: DropdownButtonAction[];
};
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
                    {user.show_diabetes && (
                        <>
                            <span className="">{`BloodSugar ${foodGroup.eventlog.blood_glucose.toFixed(1)}`}</span>
                            <span className="mx-1">{`Insulin ${foodGroup.eventlog.actual_insulin_taken.toFixed(1)}`}</span>
                        </>
                    )}
                    <span>
                        {`Calories ${CalculateCalories(
                            foodGroup.total_protein,
                            foodGroup.total_carb - foodGroup.total_fibre,
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
                                    const shown = i === curRow;
                                    const toggle = () => setCurRow(shown ? -1 : i);
                                    return (
                                        <Fragment key={food.id}>
                                            {shown && (
                                                <tr className="cursor-pointer" onClick={toggle}>
                                                    <td className="border-c-l-green border-t border-l " colSpan={7}>
                                                        <div className="mx-1">{food.name}</div>
                                                    </td>
                                                </tr>
                                            )}
                                            <tr onClick={toggle} className="cursor-pointer">
                                                <td
                                                    className={`whitespace-nowrap max-w-[100px] sm:w-full pr-2 ${shown ? 'border-b border-l border-c-l-green' : ''} `}
                                                >
                                                    {!shown ? (
                                                        <div className="overflow-x-hidden">{food.name}</div>
                                                    ) : (
                                                        <div className="w-full">&nbsp;</div>
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
export function EventsPage(state: BaseState) {
    const [showNewEventPanel, setShowNewEventPanel] = useState<boolean>(false);
    const [numberToShow, setNumberToShow] = useState<number>(15);
    const [newEvent, setNewEvent] = useState<UserEventFoodLog>(UserEventFoodLogFactory.empty());
    const [editEvent, setEditEvent] = useState<UserEventFoodLog>(UserEventFoodLogFactory.empty());
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleErr = (e: unknown) => {
        if (e instanceof ApiError) {
            setErrorMsg(e.message);
            if (e.isUnauthorizedError()) {
                state.doRefresh();
            }
        } else if (e instanceof Error) {
            setErrorMsg(e.message);
        } else {
            setErrorMsg(`An unknown error occurred: ${e}`);
        }
    };

    const onCreateEvent = (eventlog: CreateUserEventLog) => {
        ApiNewEventLog(eventlog)
            .then((newEventlog: UserEventFoodLog) => {
                state.setEventLogs((e) => [newEventlog, ...(e === null ? [] : e)]);
                setNewEvent(UserEventFoodLogFactory.empty());
                setShowNewEventPanel(false);
                setErrorMsg(null);
            })
            .catch(handleErr);
    };

    const onUpdateEvent = (eventlogId: number, eventlog: CreateUserEventLog) => {
        const updateEventLog: UpdateUserEventLog = {
            eventlog: {
                // server ignores these
                created: 0,
                event_id: 0,
                user_id: 0,
                net_carbs: 0,
                // server ignores these
                id: eventlogId,
                user_time: eventlog.created_time,
                event: eventlog.event.name,
                blood_glucose: eventlog.blood_glucose,
                blood_glucose_target: eventlog.blood_glucose_target,
                insulin_sensitivity_factor: eventlog.insulin_sensitivity_factor,
                insulin_to_carb_ratio: eventlog.insulin_to_carb_ratio,
                recommended_insulin_amount: eventlog.recommended_insulin_amount,
                actual_insulin_taken: eventlog.actual_insulin_taken,
            },
            foodlogs: eventlog.foods as TblUserFoodLog[],
        };

        ApiUpdateUserEventLog(updateEventLog)
            .then((newEventlog: UserEventFoodLog) => {
                state.setEventLogs((e: UserEventFoodLog[] | null) =>
                    e === null
                        ? e
                        : e.map((log: UserEventFoodLog) => {
                              if (log.eventlog.id === newEventlog.eventlog.id) {
                                  return newEventlog;
                              }
                              return log;
                          })
                );

                setEditEvent(UserEventFoodLogFactory.empty());
                setErrorMsg(null);
            })
            .catch(handleErr);
    };

    const onDeleteEvent = (eventlog: UserEventFoodLog) => {
        ApiDeleteUserEventLog(eventlog.eventlog)
            .then(() => {
                state.setEventLogs((old: UserEventFoodLog[] | null) => {
                    return old ? old.filter((x: UserEventFoodLog) => x.eventlog.id !== eventlog.eventlog.id) : null;
                });

                setErrorMsg(null);
            })
            .catch(handleErr);
    };

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button
                    className={`w-24 ${showNewEventPanel && 'bg-c-l-red'}`}
                    onClick={() => {
                        setShowNewEventPanel((x) => !x);
                        setNewEvent(UserEventFoodLogFactory.empty());
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
                                const blob = new Blob([GenerateEventTableText(state.user, state.eventlogs)], {
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

            <ErrorDiv errorMsg={errorMsg} />
            {showNewEventPanel && (
                <>
                    <AddEventsPanel
                        dialogTitle={'Create New Event'}
                        saveButtonTitle={'Create Event'}
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
                {state.eventlogs.slice(0, numberToShow).map((foodGroup: UserEventFoodLog) =>
                    editEvent.eventlog.id === foodGroup.eventlog.id ? (
                        <AddEventsPanel
                            key={`e-${editEvent.eventlog.id}`}
                            copyDate={true}
                            dialogTitle={`Update Event: ${editEvent.eventlog.id}`}
                            saveButtonTitle={'Update Event'}
                            user={state.user}
                            foods={state.foods}
                            events={state.events}
                            fromEvent={editEvent}
                            createEvent={(n: CreateUserEventLog) => onUpdateEvent(foodGroup.eventlog.id, n)}
                            actionButtons={[
                                <button
                                    key={`c-${editEvent.eventlog.id}`}
                                    className="text-sm text-c-l-red font-bold w-24 mx-1"
                                    onClick={() => setEditEvent(UserEventFoodLogFactory.empty())}
                                >
                                    Cancel
                                </button>,
                            ]}
                        />
                    ) : (
                        <EventPanel
                            key={foodGroup.eventlog.id}
                            user={state.user}
                            foodGroup={foodGroup}
                            actions={[
                                {
                                    label: 'Copy',
                                    onClick: () => {
                                        setNewEvent(foodGroup);
                                        setShowNewEventPanel(true);
                                        window.scrollTo({top: 0, behavior: 'smooth'});
                                    },
                                },
                                {
                                    label: 'Edit',
                                    onClick: () => setEditEvent(foodGroup),
                                },
                                {
                                    label: 'Delete',
                                    dangerous: true,
                                    onClick: () => {
                                        if (confirm('Delete this event?')) {
                                            onDeleteEvent(foodGroup);
                                        }
                                    },
                                },
                            ]}
                        />
                    )
                )}
            </div>
        </>
    );
}
