import {useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {CreateUserEventLog, TblUserFoodLog, UpdateUserEventLog, UserEventFoodLog} from '../../api/types';
import {ApiDeleteUserEventLog, ApiError, ApiNewEventLog, ApiUpdateUserEventLog} from '../../api/api';
import {AddEventsPanel} from './add_event_panel';
import {UserEventFoodLogFactory} from '../../api/factories';
import {NumberInput} from '../../components/number_input';
import {ErrorDiv} from '../../components/error_div';
import {EventPanel} from './event_panel';

export const EventsPage = (state: BaseState) => {
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
        if (confirm('Delete this event?')) {
            ApiDeleteUserEventLog(eventlog.eventlog)
                .then(() => {
                    state.setEventLogs((old: UserEventFoodLog[] | null) => {
                        return old ? old.filter((x: UserEventFoodLog) => x.eventlog.id !== eventlog.eventlog.id) : null;
                    });

                    setErrorMsg(null);
                })
                .catch(handleErr);
        }
    };

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button
                    disabled={showNewEventPanel}
                    className="w-24"
                    onClick={() => {
                        setShowNewEventPanel(true);
                        setNewEvent(UserEventFoodLogFactory.empty());
                    }}
                >
                    New Event
                </button>

                <NumberInput label={'Show Last'} min={1} step={5} value={numberToShow} onValueChange={setNumberToShow} />
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewEventPanel && (
                <AddEventsPanel
                    dialogTitle={'New Event'}
                    saveButtonTitle={'Create Event'}
                    user={state.user}
                    foods={state.foods}
                    events={state.events}
                    fromEvent={newEvent}
                    createEvent={onCreateEvent}
                    onCancel={() => setShowNewEventPanel(false)}
                />
            )}

            <div className={`w-full space-y-4 ${showNewEventPanel && 'mt-4'}`}>
                {state.eventlogs.length === 0 && (
                    <div className="text-center font-bold py-32">
                        Shhh… the list is taking a nap right now.
                        <br /> Try adding something to wake it up!
                    </div>
                )}
                {state.eventlogs.slice(0, numberToShow).map((foodGroup: UserEventFoodLog) =>
                    editEvent.eventlog.id === foodGroup.eventlog.id ? (
                        <AddEventsPanel
                            key={`e-${editEvent.eventlog.id}`}
                            copyDate={true}
                            dialogTitle={`Edit Event`}
                            saveButtonTitle={'Update Event'}
                            user={state.user}
                            foods={state.foods}
                            events={state.events}
                            fromEvent={editEvent}
                            createEvent={(n: CreateUserEventLog) => onUpdateEvent(foodGroup.eventlog.id, n)}
                            onCancel={() => setEditEvent(UserEventFoodLogFactory.empty())}
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
                                    onClick: () => onDeleteEvent(foodGroup),
                                },
                            ]}
                        />
                    )
                )}
            </div>
        </>
    );
};
