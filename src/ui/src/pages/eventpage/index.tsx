import {useState} from 'preact/hooks';
import {RefreshOnUnauthorized} from '../../utils/error';
import {BaseState} from '../../state/basestate';
import {CreateUserEventLog, TblUserFoodLog, UpdateUserEventLog, UserEventFoodLog} from '../../api/types';
import {ApiDeleteUserEventLog, ApiError, ApiGetUserEventFoodLog, ApiNewEventLog, ApiUpdateUserEventLog} from '../../api/api';
import {AddEventsPanel} from './add_event_panel';
import {UserEventFoodLogFactory} from '../../api/factories';
import {LoadMore, useListPaging} from '../../components/load_more';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {EventPanel} from './event_panel';

export const EventsPage = (state: BaseState) => {
    const [showNewEventPanel, setShowNewEventPanel] = useState<boolean>(false);
    const [newEvent, setNewEvent] = useState<UserEventFoodLog>(UserEventFoodLogFactory.empty());
    const [editEvent, setEditEvent] = useState<UserEventFoodLog>(UserEventFoodLogFactory.empty());
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);

    const paging = useListPaging({
        total: state.eventlogs.length,
        firstFetchSize: state.user.event_history_fetch_limit,
        onUnauthorized: state.doRefresh,
        fetchOlder: (n: number) =>
            ApiGetUserEventFoodLog(n, state.eventlogs.length).then((older: UserEventFoodLog[]) => {
                state.setEventLogs((e: UserEventFoodLog[]) => {
                    const have = new Set(e.map((x) => x.eventlog.id));
                    return [...e, ...older.filter((x) => !have.has(x.eventlog.id))];
                });
                return older.length;
            }),
    });

    const handleErr = (e: unknown) => {
        if (e instanceof ApiError) {
            setErrorMsg(e);
            if (e.isUnauthorizedError()) {
                state.doRefresh();
            }
        } else if (e instanceof Error) {
            setErrorMsg(e);
        } else {
            setErrorMsg(`An unknown error occurred: ${e}`);
        }
    };

    // onCreateEvent saves a new event. It rejects with the API error so the panel can show it.
    const onCreateEvent = (eventlog: CreateUserEventLog): Promise<void> => {
        return ApiNewEventLog(eventlog)
            .then((newEventlog: UserEventFoodLog) => {
                state.setEventLogs((e) => [newEventlog, ...(e === null ? [] : e)]);
                setNewEvent(UserEventFoodLogFactory.empty());
                setShowNewEventPanel(false);
                setErrorMsg(null);
            })
            .catch(RefreshOnUnauthorized(state.doRefresh));
    };

    // onUpdateEvent saves an edited event. It rejects with the API error so the panel can show it.
    const onUpdateEvent = (eventlogId: number, eventlog: CreateUserEventLog): Promise<void> => {
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

        return ApiUpdateUserEventLog(updateEventLog)
            .then((newEventlog: UserEventFoodLog) => {
                state.setEventLogs((e: UserEventFoodLog[]) =>
                    e.map((log: UserEventFoodLog) => {
                        if (log.eventlog.id === newEventlog.eventlog.id) {
                            return newEventlog;
                        }
                        return log;
                    })
                );

                setEditEvent(UserEventFoodLogFactory.empty());
                setErrorMsg(null);
            })
            .catch(RefreshOnUnauthorized(state.doRefresh));
    };

    const onDeleteEvent = (eventlog: UserEventFoodLog) => {
        if (confirm('Delete this event?')) {
            ApiDeleteUserEventLog(eventlog.eventlog)
                .then(() => {
                    state.setEventLogs((old: UserEventFoodLog[]) => {
                        return old.filter((x: UserEventFoodLog) => x.eventlog.id !== eventlog.eventlog.id);
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
                    onClick={() => {
                        setShowNewEventPanel(true);
                        setNewEvent(UserEventFoodLogFactory.empty());
                    }}
                >
                    New Event
                </button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewEventPanel && (
                <AddEventsPanel
                    dialogTitle={'New Event'}
                    saveButtonTitle={'Create Event'}
                    user={state.user}
                    foods={state.foods}
                    events={state.events}
                    eventlogs={state.eventlogs}
                    fromEvent={newEvent}
                    createEvent={onCreateEvent}
                    onCancel={() => setShowNewEventPanel(false)}
                />
            )}

            {editEvent.eventlog.id !== 0 && (
                <AddEventsPanel
                    key={`e-${editEvent.eventlog.id}`}
                    copyDate={true}
                    dialogTitle={'Edit Event'}
                    saveButtonTitle={'Update Event'}
                    user={state.user}
                    foods={state.foods}
                    events={state.events}
                    eventlogs={state.eventlogs}
                    fromEvent={editEvent}
                    createEvent={(n: CreateUserEventLog) => onUpdateEvent(editEvent.eventlog.id, n)}
                    onCancel={() => setEditEvent(UserEventFoodLogFactory.empty())}
                />
            )}

            <div className="w-full flex flex-col gap-4">
                {state.eventlogs.length === 0 && (
                    <div className="text-center py-32">
                        <h3>Shhh... the list is taking a nap right now.</h3>
                        <small>Try adding something to wake it up!</small>
                    </div>
                )}
                <div ref={paging.listRef} className="contents">
                    {state.eventlogs.slice(0, paging.shown).map((foodGroup: UserEventFoodLog) => (
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
                    ))}
                </div>
            </div>

            <LoadMore paging={paging} itemsName="events" />
        </>
    );
};
