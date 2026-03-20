import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {RefObject} from 'preact';
import {BarrelPicker} from './barrel_picker';
import {DoRender} from '../hooks/doRender';
import {StopWatchSvg} from './svg';

const THIS_YEAR = new Date().getFullYear();
const YEARS_TO_ALLOW = 1000;

const AMPM_FORMAT = (v: number) => (v === 0 ? 'AM' : 'PM');

const pad2 = (n: number) => n.toString().padStart(2, '0');
const to12 = (h24: number) => (h24 % 12 === 0 ? 12 : h24 % 12);
const to24 = (h12: number, isPm: boolean) => (isPm ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12);

type DialogProps = {
    value: Date;
    onSave: (d: Date) => void;
    onClose: () => void;
    showSeconds: boolean;
    showDate: boolean;
    hour12: boolean;
};

const TimeInputDialog = ({value, onSave, onClose, showDate, showSeconds, hour12}: DialogProps) => {
    const timeRef = useMemo(() => {
        return {
            year: value.getFullYear(),
            month: value.getMonth(),
            day: value.getDate(),
            // if we are 12 hour time, this holds 12 hour time, otherwise it holds 24 hour time
            hours: hour12 ? to12(value.getHours()) : value.getHours(),
            minutes: value.getMinutes(),
            seconds: value.getSeconds(),
            isPm: value.getHours() >= 12,
        };
    }, [value, hour12]);

    useEffect(() => {
        document.body.classList.add('overflow-hidden');
        return () => {
            document.body.classList.remove('overflow-hidden');
        };
    }, []);

    const render = DoRender();

    const doSave = () => {
        const d = new Date(value);
        if (showDate) {
            d.setFullYear(timeRef.year);
            d.setMonth(timeRef.month);
            d.setDate(timeRef.day);
        }
        if (hour12) {
            d.setHours(to24(timeRef.hours, timeRef.isPm));
        } else {
            d.setHours(timeRef.hours);
        }
        d.setMinutes(timeRef.minutes);
        d.setSeconds(timeRef.seconds);
        onSave(d);
    };

    const sep = <div className="flex items-center select-none text-2xl font-bold text-faded mx-1 self-center">:</div>;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-c-crust/50" onClick={onClose}>
            <div
                className="container-theme rounded-t-2xl sm:rounded-xl w-full sm:max-w-xs pb-6 pt-4 px-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-stretch justify-center">
                    {showDate && (
                        <BarrelPicker
                            label="Year"
                            min={THIS_YEAR - YEARS_TO_ALLOW}
                            max={THIS_YEAR + YEARS_TO_ALLOW}
                            selected={timeRef.year}
                            onChange={(h) => {
                                timeRef.year = h;
                                render();
                            }}
                            format={pad2}
                        />
                    )}
                    {showDate && sep}
                    {showDate && (
                        <BarrelPicker
                            label="Month"
                            min={1}
                            max={12}
                            selected={timeRef.month + 1}
                            onChange={(h) => {
                                timeRef.month = h - 1;
                                render();
                            }}
                            format={pad2}
                        />
                    )}
                    {showDate && sep}
                    {showDate && (
                        <BarrelPicker
                            label="Day"
                            min={1}
                            max={31}
                            selected={timeRef.day}
                            onChange={(h) => {
                                timeRef.day = h;
                                render();
                            }}
                            format={pad2}
                        />
                    )}
                </div>
                <div className="flex items-stretch justify-center">
                    <BarrelPicker
                        label="Hour"
                        min={hour12 ? 1 : 0}
                        max={hour12 ? 12 : 23}
                        selected={timeRef.hours}
                        onChange={(h) => {
                            timeRef.hours = h;
                            render();
                        }}
                        format={pad2}
                    />
                    {sep}
                    <BarrelPicker
                        label="Min"
                        min={0}
                        max={59}
                        selected={timeRef.minutes}
                        onChange={(m) => {
                            timeRef.minutes = m;
                            render();
                        }}
                        format={pad2}
                    />
                    {showSeconds && sep}
                    {showSeconds && (
                        <BarrelPicker
                            label="Sec"
                            min={0}
                            max={59}
                            selected={timeRef.seconds}
                            onChange={(s) => {
                                timeRef.seconds = s;
                                render();
                            }}
                            format={pad2}
                        />
                    )}
                    {hour12 && (
                        <BarrelPicker
                            label="Am/Pm"
                            allowWrap={false}
                            min={0}
                            max={1}
                            selected={timeRef.isPm ? 1 : 0}
                            onChange={(v) => {
                                timeRef.isPm = v === 1;
                                render();
                            }}
                            format={AMPM_FORMAT}
                            width="w-20"
                        />
                    )}
                </div>

                <div className="flex flex-row gap-2 my-2">
                    <button className="w-full mt-4 bg-c-red font-bold" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="w-full mt-4 bg-c-green font-bold" onClick={doSave}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

type SegmentProps = {
    value: number;
    min: number;
    max: number;
    digits?: number;
    onChange: (v: number) => void;
    inputRef: RefObject<HTMLInputElement>;
    onAutoAdvance?: () => void;
};

const Segment = ({value, min, max, onChange, inputRef, onAutoAdvance, digits = 2}: SegmentProps) => {
    const [text, setText] = useState(pad2(value));

    useEffect(() => {
        setText(pad2(value));
    }, [value]);

    const commitN = (n: number) => {
        const clamped = Math.min(max, Math.max(min, n));
        const newVal = pad2(clamped);
        if (inputRef.current) {
            // this prevents commitN being called again on onFocusOut
            inputRef.current.value = newVal;
        }
        setText(newVal);
        onChange(clamped);
    };

    return (
            <input
                ref={inputRef}
                className="p-0 border-none focus:outline-none text-center"
                style={{width: `${digits}ch`}}
                type="text"
                inputMode="numeric"
                value={text}
                onFocusIn={(e) => {
                    e.currentTarget.select();
                }}
                onFocusOut={(e) => {
                    const v = e.currentTarget.value;
                    if (v === text) {
                        return;
                    }
                    const n = parseInt(v, 10);
                    if (isNaN(n)) {
                        e.currentTarget.value = pad2(value);
                    } else {
                        commitN(n);
                    }
                }}
                onInput={(e) => {
                    const v = e.currentTarget.value;
                    const val = parseInt(v, 10);

                    if (isNaN(val) || val < 0) {
                        setText(v.substring(Math.max(0, v.length - 1), v.length));
                    } else if (val <= Math.pow(10, digits - 1) && val * 10 <= max && v.length < digits) {
                        setText(v);
                    } else {
                        commitN(val);
                        onAutoAdvance?.();
                    }
                }}
            />
    );
};

type TimeInputProps = {
    className?: string;
    label?: string;
    value: Date;
    onChange: (value: Date) => void;
    showSeconds?: boolean;
    showDate?: boolean;
    hour12?: boolean;
};

export const TimeInput = ({
    value,
    onChange,
    label,
    showDate = false,
    showSeconds = false,
    hour12 = false,
    className = '',
}: TimeInputProps) => {
    const yearRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const dayRef = useRef<HTMLInputElement>(null);
    const hourRef = useRef<HTMLInputElement>(null);
    const minuteRef = useRef<HTMLInputElement>(null);
    const secondRef = useRef<HTMLInputElement>(null);
    const ampmRef = useRef<HTMLInputElement>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const h24 = value.getHours();
    const isPm = h24 >= 12;

    const focusFirst = (e: MouseEvent) => {
        if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'BUTTON') {
            if (showDate) {
                yearRef.current?.focus();
            } else {
                hourRef.current?.focus();
            }
        }
    };

    const setYear = (h: number) => {
        const d = new Date(value);
        d.setFullYear(h);
        onChange(d);
    };

    const setMonth = (h: number) => {
        const d = new Date(value);
        d.setMonth(h - 1);
        onChange(d);
    };

    const setDay = (h: number) => {
        const d = new Date(value);
        d.setDate(h);
        onChange(d);
    };

    const setHours = (h: number) => {
        const d = new Date(value);
        d.setHours(h);
        onChange(d);
    };

    const setHours12 = (h12: number) => {
        const d = new Date(value);
        d.setHours(to24(h12, isPm));
        onChange(d);
    };

    const toggleAmPm = () => {
        const d = new Date(value);
        d.setHours(h24 < 12 ? h24 + 12 : h24 - 12);
        onChange(d);
    };

    const setMinutes = (m: number) => {
        const d = new Date(value);
        d.setMinutes(m);
        onChange(d);
    };

    const setSeconds = (s: number) => {
        const d = new Date(value);
        d.setSeconds(s);
        onChange(d);
    };

    const advanceFromYear = () => {
        monthRef.current?.focus();
    };
    const advanceFromMonth = () => {
        dayRef.current?.focus();
    };
    const advanceFromDay = () => {
        hourRef.current?.focus();
    };
    const advanceFromHour = () => {
        minuteRef.current?.focus();
    };
    const advanceFromMinute = () => {
        if (showSeconds) {
            secondRef.current?.focus();
        } else if (hour12) {
            ampmRef.current?.focus();
        }
    };
    const advanceFromSecond = () => {
        if (hour12) {
            ampmRef.current?.focus();
        }
    };

    const timeSep = <span className="flex items-center select-none text-faded px-0.5">:</span>;
    const dateSep = <span className="flex items-center select-none text-faded px-0.5">/</span>;
    const invisSep = <span className="flex items-center select-none text-faded px-0.5">&nbsp;&nbsp;</span>;

    return (
        <>
            <div className={`flex flex-row items-center input-like pl-1 ${className}`} onClick={focusFirst}>
                {label && <div className="flex flex-1 items-center wsnw select-none px-1">{label}</div>}
                {showDate && (
                    <Segment
                        inputRef={yearRef}
                        value={value.getFullYear()}
                        digits={4}
                        min={THIS_YEAR - YEARS_TO_ALLOW}
                        max={THIS_YEAR + YEARS_TO_ALLOW}
                        onChange={setYear}
                        onAutoAdvance={advanceFromYear}
                    />
                )}
                {showDate && dateSep}
                {showDate && (
                    <Segment
                        inputRef={monthRef}
                        value={value.getMonth() + 1}
                        min={1}
                        max={12}
                        onChange={setMonth}
                        onAutoAdvance={advanceFromMonth}
                    />
                )}
                {showDate && dateSep}
                {showDate && (
                    <Segment
                        inputRef={dayRef}
                        value={value.getDate()}
                        min={1}
                        max={31}
                        onChange={setDay}
                        onAutoAdvance={advanceFromDay}
                    />
                )}

                {showDate && invisSep}

                <Segment
                    inputRef={hourRef}
                    value={hour12 ? to12(h24) : h24}
                    min={hour12 ? 1 : 0}
                    max={hour12 ? 12 : 23}
                    onChange={hour12 ? setHours12 : setHours}
                    onAutoAdvance={advanceFromHour}
                />
                {timeSep}
                <Segment
                    inputRef={minuteRef}
                    value={value.getMinutes()}
                    min={0}
                    max={59}
                    onChange={setMinutes}
                    onAutoAdvance={advanceFromMinute}
                />
                {showSeconds && timeSep}
                {showSeconds && (
                    <Segment
                        inputRef={secondRef}
                        value={value.getSeconds()}
                        min={0}
                        max={59}
                        onChange={setSeconds}
                        onAutoAdvance={advanceFromSecond}
                    />
                )}
                {hour12 && (
                    <div className="flex flex-row">
                        <input
                            ref={ampmRef}
                            className="w-8 border-none focus:outline-none text-center text-xs"
                            type="text"
                            value={isPm ? 'PM' : 'AM'}
                            onFocusIn={(e) => e.currentTarget.select()}
                            onInput={(e) => {
                                const v = e.currentTarget.value.toLowerCase();
                                if (isPm) {
                                    if (v.includes('a')) {
                                        toggleAmPm();
                                    }
                                } else if (v.includes('p')) {
                                    toggleAmPm();
                                }
                            }}
                        />
                    </div>
                )}

                <button
                    tabIndex={-1}
                    className="h-full select-none px-2 p-0 leading-none border-none bg-transparent hover:bg-c-overlay1"
                    onClick={(e) => {
                        e.stopPropagation();
                        setDialogOpen(true);
                    }}
                >
                    {StopWatchSvg}
                </button>
            </div>

            {dialogOpen && (
                <TimeInputDialog
                    value={value}
                    onSave={(d) => {
                        onChange(d);
                        setDialogOpen(false);
                    }}
                    onClose={() => setDialogOpen(false)}
                    showDate={showDate}
                    showSeconds={showSeconds}
                    hour12={hour12}
                />
            )}
        </>
    );
};
