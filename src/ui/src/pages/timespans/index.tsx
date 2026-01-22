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

export function TimespansPage(state: BaseState) {
    const [showNewTimespan, setShowNewTimespan] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const startRef = useRef<HTMLInputElement>(null);
    const stopRef = useRef<HTMLInputElement>(null);
    const noteRef = useRef<HTMLTextAreaElement>(null);

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

    const startTimerNow = (tags?: TblUserTag[]) => {
        const newTimespan = {
            timespan: {
                start_time: new Date().getTime(),
                stop_time: 0,
                note: noteRef.current?.value || null,
            } as TblUserTimespan,
            tags: tags ?? [],
        } as TaggedTimespan;

        ApiNewUserTimespan(newTimespan)
            .then((ts: TaggedTimespan) => {
                state.setTimespans((old) => (old ? [ts, ...old] : [ts]));

                setShowNewTimespan(false);
                if (startRef.current) {
                    startRef.current.value = '';
                }
                if (stopRef.current) {
                    stopRef.current.value = '';
                }
                if (noteRef.current) {
                    noteRef.current.value = '';
                }
            })
            .catch(handleErr);
    };

    const stopTimer = (ts: TaggedTimespan) => {
        const newTimespan = {
            id: ts.timespan.id,
            start_time: ts.timespan.start_time,
            stop_time: new Date().getTime(),
            note: ts.timespan.note,
        } as TblUserTimespan;

        ApiUpdateUserTimespan(newTimespan)
            .then(() =>
                state.setTimespans((oldTs: TaggedTimespan[] | null) =>
                    oldTs === null
                        ? null
                        : oldTs.map((t: TaggedTimespan) => {
                              if (t.timespan.id === newTimespan.id) {
                                  t.timespan.stop_time = newTimespan.stop_time;
                              }
                              return t;
                          })
                )
            )
            .catch(handleErr);
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
                <button className="px-4 py-2 border rounded" onClick={() => startTimerNow()}>
                    {' '}
                    Quick Timer{' '}
                </button>

                <button
                    className={`w-24 ${showNewTimespan && 'bg-c-l-red font-bold'}`}
                    onClick={() => {
                        setShowNewTimespan((x) => !x);
                    }}
                >
                    {!showNewTimespan ? 'New Timer' : 'Cancel'}
                </button>

                {
                    //                <NumberInput label={'Show Last'} min={1} step={5} value={numberToShow} onValueChange={setNumberToShow} />
                }
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            {showNewTimespan && (
                <div className="mb-4 p-4 border rounded space-y-3">
                    <div>
                        <label className="block text-sm mb-1">Start (ms since UTC epoch)</label>
                        <input
                            ref={startRef}
                            type="number"
                            className="w-full border rounded px-2 py-1"
                            placeholder="e.g. 1700000000000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Stop (ms since UTC epoch)</label>
                        <input ref={stopRef} type="number" className="w-full border rounded px-2 py-1" />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Note</label>
                        <textarea ref={noteRef} className="w-full border rounded px-2 py-1" rows={2} />
                    </div>

                    <button className="px-4 py-2 border rounded" onClick={startTimerNow}>
                        Create Timespan
                    </button>
                </div>
            )}

            <div className="grid gap-2">
                <ActiveTimerPanel
                    timers={runningTimers}
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
                                timer={ts}
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
