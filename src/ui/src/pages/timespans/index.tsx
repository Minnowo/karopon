import {useMemo, useRef, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {
    ApiDeleteUserTimespan,
    ApiError,
    ApiNewUserTimespan,
    ApiUpdateUserTimespan,
    ApiUpdateUserTimespanTags,
} from '../../api/api';
import {TaggedTimespan, TblUserTag, TblUserTimespan} from '../../api/types';
import {ErrorDiv} from '../../components/error_div';
import {TimerPanel} from './timer_panel';
import {ActiveTimerPanel} from './active_timers_panel';
import {AddTimerPanel} from './add_timer_panel';
import {NewTaggedTimespan} from '../../api/factories';

export function TimespansPage(state: BaseState) {
    const [showNewTimespan, setShowNewTimespan] = useState(false);
    const [showManageTags, setShowManageTags] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [tmpTimer, setTmpTimer] = useState<TaggedTimespan>(NewTaggedTimespan());

    const runningTimers = useMemo(() => state.timespans.filter((ts) => ts.timespan.stop_time === 0), [state.timespans]);

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

    const updateTags = (timer: TaggedTimespan) => {
        ApiUpdateUserTimespanTags(timer)
            .then(() =>
                state.setTimespans((oldTs: TaggedTimespan[] | null) =>
                    oldTs === null
                        ? null
                        : oldTs.map((t: TaggedTimespan) => {
                              if (t.timespan.id === timer.timespan.id) {
                                  return timer;
                              }
                              return t;
                          })
                )
            )
            .catch(handleErr);
    };

    const newTimer = (newTimespan: TaggedTimespan) => {
        ApiNewUserTimespan(newTimespan)
            .then((ts: TaggedTimespan) => {
                state.setTimespans((old) => (old ? [ts, ...old] : [ts]));

                setShowNewTimespan(false);
            })
            .catch(handleErr);
    };

    const updateTimespan = (newTimespan: TblUserTimespan) => {
        ApiUpdateUserTimespan(newTimespan)
            .then(() =>
                state.setTimespans((oldTs: TaggedTimespan[] | null) =>
                    oldTs === null
                        ? null
                        : oldTs.map((t: TaggedTimespan) => {
                              if (t.timespan.id === newTimespan.id) {
                                  t.timespan = newTimespan;
                              }
                              return t;
                          })
                )
            )
            .catch(handleErr);
    };

    const startTimerNow = (tags?: TblUserTag[]) => {
        const newTimespan = {
            timespan: {
                start_time: new Date().getTime(),
                stop_time: 0,
                note: null,
            } as TblUserTimespan,
            tags: tags ?? [],
        } as TaggedTimespan;

        newTimer(newTimespan);
    };

    const stopTimer = (ts: TaggedTimespan) => {
        const newTimespan = {
            id: ts.timespan.id,
            start_time: ts.timespan.start_time,
            stop_time: new Date().getTime(),
            note: ts.timespan.note,
        } as TblUserTimespan;
        updateTimespan(newTimespan);
    };

    const continueTimer = (timer: TaggedTimespan) => {
        startTimerNow(timer.tags);
    };

    const editTimer = (timer: TaggedTimespan) => {};

    const deleteTimer = (timer: TaggedTimespan) => {
        const payload = {
            id: timer.timespan.id,
        } as TblUserTimespan;

        ApiDeleteUserTimespan(payload)
            .then(() => {
                state.setTimespans((oldTs) => (oldTs === null ? null : oldTs.filter((t) => t.timespan.id !== timer.timespan.id)));
            })
            .catch(handleErr);
    };

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button className="w-24" onClick={() => startTimerNow()}>
                    Quick Timer
                </button>

                <button
                    className={`w-24 ${showNewTimespan ? 'bg-c-l-red font-bold' : ''}`}
                    onClick={() => {
                        setShowNewTimespan((x) => !x);
                        setTmpTimer(NewTaggedTimespan());
                    }}
                >
                    {!showNewTimespan ? 'New Timer' : 'Cancel'}
                </button>
                {
                    // <button
                    //     className={`w-24 ${showManageTags ? 'bg-c-l-red font-bold' : ''}`}
                    //     onClick={() => setShowManageTags((x) => !x)}
                    // >
                    //     {!showManageTags ? 'Edit Tags' : 'Cancel'}
                    // </button>
                    //                <NumberInput label={'Show Last'} min={1} step={5} value={numberToShow} onValueChange={setNumberToShow} />
                }
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewTimespan && (
                <AddTimerPanel
                    namespaces={state.namespaces}
                    setNamespaces={state.setNamespaces}
                    timer={tmpTimer}
                    createTimer={newTimer}
                    showTimeEditing={false}
                    saveButtonTitle={'New Timer'}
                />
            )}

            <div className="grid gap-2">
                <ActiveTimerPanel
                    namespaces={state.namespaces}
                    setNamespaces={state.setNamespaces}
                    timers={runningTimers}
                    updateTimespan={updateTimespan}
                    updateTags={updateTags}
                    continueTimer={continueTimer}
                    editTimer={editTimer}
                    deleteTimer={deleteTimer}
                    stopTimer={stopTimer}
                />

                {state.timespans.length === 0 ? (
                    <p>No timespans found.</p>
                ) : (
                    state.timespans
                        .filter((ts) => ts.timespan.stop_time !== 0)
                        .map((ts: TaggedTimespan) => (
                            <TimerPanel
                                key={ts.timespan.id}
                                namespaces={state.namespaces}
                                setNamespaces={state.setNamespaces}
                                timer={ts}
                                updateTimespan={updateTimespan}
                                updateTags={updateTags}
                                continueTimer={continueTimer}
                                editTimer={editTimer}
                                deleteTimer={deleteTimer}
                                stopTimer={stopTimer}
                            />
                        ))
                )}
            </div>
        </>
    );
}
