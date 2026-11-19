import {useMemo, useState} from 'preact/hooks';
import {PageErrorMessage, RefreshOnUnauthorized} from '../../utils/error';
import {BaseState} from '../../state/basestate';
import {
    ApiDeleteUserTimespan,
    ApiError,
    ApiGetUserTimespans,
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
import {LoadMore, useListPaging} from '../../components/load_more';

export function TimespansPage(state: BaseState) {
    const [showNewTimespan, setShowNewTimespan] = useState(false);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [tmpTimer, setTmpTimer] = useState<TaggedTimespan>(NewTaggedTimespan());

    const runningTimers = useMemo(() => state.timespans.filter((ts) => ts.timespan.stop_time === 0), [state.timespans]);
    const stoppedTimers = useMemo(() => state.timespans.filter((ts) => ts.timespan.stop_time !== 0), [state.timespans]);
    const paging = useListPaging({
        total: stoppedTimers.length,
        loaded: state.timespans.length,
        firstFetchSize: state.user.timespan_history_fetch_limit,
        onUnauthorized: state.doRefresh,
        fetchOlder: (n: number) =>
            ApiGetUserTimespans(n, state.timespans.length).then((older: TaggedTimespan[]) => {
                state.setTimespans((t: TaggedTimespan[]) => {
                    const have = new Set(t.map((x) => x.timespan.id));
                    return [...t, ...older.filter((x) => !have.has(x.timespan.id))];
                });
                return older.length;
            }),
    });
    const tagColorMap = useMemo(() => {
        const m = new Map();
        for (const c of state.tagColors) {
            m.set(c.namespace, c.color);
        }
        return m;
    }, [state.tagColors]);

    const handleErr = (e: unknown) => {
        if (e instanceof ApiError) {
            setErrorMsg(PageErrorMessage(e) ?? e);
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

    // newTimer starts a timer from a quick action (Start Timer, Continue); errors show on the page.
    const newTimer = (newTimespan: TaggedTimespan) => {
        ApiNewUserTimespan(newTimespan)
            .then((ts: TaggedTimespan) => {
                state.setTimespans((old) => (old ? [ts, ...old] : [ts]));
            })
            .catch(handleErr);
    };

    // saveTimespan saves a timer edit. It rejects with the API error so the edit dialog can show it.
    const saveTimespan = (newTimespan: TblUserTimespan): Promise<void> => {
        return ApiUpdateUserTimespan(newTimespan)
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
            .catch(RefreshOnUnauthorized(state.doRefresh));
    };

    // updateTimespan is for quick actions (stop, a note) that report errors on the page.
    const updateTimespan = (newTimespan: TblUserTimespan) => {
        saveTimespan(newTimespan).catch(handleErr);
    };

    // createTimer saves a new timer from the dialog. It rejects with the API error so the dialog can show it.
    const createTimer = (newTimespan: TaggedTimespan): Promise<void> => {
        return ApiNewUserTimespan(newTimespan)
            .then((ts: TaggedTimespan) => {
                state.setTimespans((old) => (old ? [ts, ...old] : [ts]));
                setShowNewTimespan(false);
            })
            .catch(RefreshOnUnauthorized(state.doRefresh));
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
            // A timer started on a device whose clock is ahead would otherwise stop before it started.
            stop_time: Math.max(Date.now(), ts.timespan.start_time),
            note: ts.timespan.note,
        } as TblUserTimespan;
        updateTimespan(newTimespan);
    };

    const continueTimer = (timer: TaggedTimespan) => {
        startTimerNow(timer.tags);
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
            <div className="w-full flex flex-wrap justify-evenly gap-2 my-4">
                <button onClick={() => startTimerNow()}>Start Timer</button>

                <button
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
                    namespaces={state.namespaces}
                    setNamespaces={state.setNamespaces}
                    tagColors={tagColorMap}
                    timer={tmpTimer}
                    showTimeEditing={false}
                    saveButtonTitle={'Start Timer'}
                    onCreate={createTimer}
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
                    saveTimespan={saveTimespan}
                    deleteTimer={deleteTimer}
                    stopTimer={stopTimer}
                />

                {state.timespans.length === 0 ? (
                    <h3 className="text-center py-32">No timespans found.</h3>
                ) : (
                    <div ref={paging.listRef} className="contents">
                        {stoppedTimers.slice(0, paging.shown).map((ts: TaggedTimespan) => (
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
                                saveTimespan={saveTimespan}
                                deleteTimer={deleteTimer}
                                stopTimer={stopTimer}
                            />
                        ))}
                    </div>
                )}
            </div>

            <LoadMore paging={paging} itemsName="timers" />
        </>
    );
}
