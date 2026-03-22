import {useMemo, useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {
    ApiDeleteUserTimespan,
    ApiError,
    ApiNewUserTimespan,
    ApiUpdateUserTimespan,
    ApiUpdateUserTimespanTags,
} from '../../api/api';
import {TaggedTimespan, TblUserTag, TblUserTimespan, UserTimeFormat} from '../../api/types';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {TimerPanel} from './timer_panel';
import {ActiveTimerPanel} from './active_timers_panel';
import {AddTimerPanel} from './add_timer_panel';
import {NewTaggedTimespan} from '../../api/factories';

export function TimespansPage(state: BaseState) {
    const [showNewTimespan, setShowNewTimespan] = useState(false);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [tmpTimer, setTmpTimer] = useState<TaggedTimespan>(NewTaggedTimespan());

    const runningTimers = useMemo(() => state.timespans.filter((ts) => ts.timespan.stop_time === 0), [state.timespans]);
    const tagColorMap = useMemo(() => {
        const m = new Map();
        for (const c of state.tagColors) {
            m.set(c.namespace, c.color);
        }
        return m;
    }, [state.tagColors]);

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

    const updateTags = (timer: TaggedTimespan) => {
        ApiUpdateUserTimespanTags(timer)
            .then(() =>
                state.setTimespans((oldTs: TaggedTimespan[]) =>
                    oldTs.map((t: TaggedTimespan) => {
                        if (t.timespan.id === timer.timespan.id) {
                            return timer;
                        }
                        return t;
                    })
                )
            )
            .catch(handleErr);
    };

    const newTimer = (newTimespan: TaggedTimespan, closeCreatePanel = false) => {
        ApiNewUserTimespan(newTimespan)
            .then((ts: TaggedTimespan) => {
                state.setTimespans((old) => (old ? [ts, ...old] : [ts]));
                if (closeCreatePanel) {
                    setShowNewTimespan(false);
                }
            })
            .catch(handleErr);
    };

    const updateTimespan = (newTimespan: TblUserTimespan) => {
        ApiUpdateUserTimespan(newTimespan)
            .then(() =>
                state.setTimespans((oldTs: TaggedTimespan[]) =>
                    oldTs.map((t: TaggedTimespan) => {
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

    const editTimer = (timer: TaggedTimespan) => {
        console.debug(timer);
    };

    const deleteTimer = (timer: TaggedTimespan) => {
        if (confirm('Delete this timer?')) {
            const payload = {
                id: timer.timespan.id,
            } as TblUserTimespan;

            ApiDeleteUserTimespan(payload)
                .then(() => {
                    state.setTimespans((oldTs) => oldTs.filter((t) => t.timespan.id !== timer.timespan.id));
                })
                .catch(handleErr);
        }
    };

    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button className="w-24" onClick={() => startTimerNow()}>
                    Quick Timer
                </button>

                <button
                    disabled={showNewTimespan}
                    className={'w-24'}
                    onClick={() => {
                        setShowNewTimespan(true);
                        setTmpTimer(NewTaggedTimespan());
                    }}
                >
                    New Timer
                </button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewTimespan && (
                <AddTimerPanel
                    className="mb-4"
                    namespaces={state.namespaces}
                    setNamespaces={state.setNamespaces}
                    tagColors={tagColorMap}
                    timer={tmpTimer}
                    showTimeEditing={false}
                    saveButtonTitle={'New Timer'}
                    onCreate={(t) => newTimer(t, true)}
                    onCancel={() => setShowNewTimespan(false)}
                />
            )}

            <div className="grid gap-4">
                <ActiveTimerPanel
                    timeformat={state.user.time_format as UserTimeFormat}
                    namespaces={state.namespaces}
                    setNamespaces={state.setNamespaces}
                    tagColors={tagColorMap}
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
                                timeformat={state.user.time_format as UserTimeFormat}
                                namespaces={state.namespaces}
                                setNamespaces={state.setNamespaces}
                                tagColors={tagColorMap}
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
