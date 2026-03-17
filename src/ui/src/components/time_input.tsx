import {useEffect, useRef, useState} from 'preact/hooks';
import {HoldButton} from './hold_button';
import {Ref} from 'preact';

type TimeInputProps = {
    className?: string;
    label?: string;
    value: Date;
    onChange: (value: Date) => void;
    showSeconds?: boolean;
    hour12?: boolean;
};

const pad2 = (n: number) => n.toString().padStart(2, '0');
const to12 = (h24: number) => (h24 % 12 === 0 ? 12 : h24 % 12);
const to24 = (h12: number, isPm: boolean) => (isPm ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12);

type SegmentProps = {
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    inputRef?: Ref<HTMLInputElement>;
    onAutoAdvance?: () => void;
};

function Segment({value, min, max, onChange, inputRef, onAutoAdvance}: SegmentProps) {
    const [text, setText] = useState(pad2(value));
    const isEditing = useRef(false);

    useEffect(() => {
        if (!isEditing.current) {
            setText(pad2(value));
        }
    }, [value]);

    const commit = (raw: string) => {
        const n = parseInt(raw, 10);
        if (!isNaN(n)) {
            const clamped = Math.min(max, Math.max(min, n));
            setText(pad2(clamped));
            onChange(clamped);
        } else {
            setText(pad2(value));
        }
    };

    // const step = (dir: 1 | -1) => {
    //     const next = value + dir;
    //     const wrapped = next > max ? min : next < min ? max : next;
    //     onChange(wrapped);
    // };

    return (
        <div className="flex flex-row items-center ">
            <input
                ref={inputRef}
                className="w-[2ch] p-0 border-none focus:outline-none text-center"
                type="text"
                inputMode="numeric"
                value={text}
                onFocusIn={(e) => {
                    isEditing.current = true;
                    e.currentTarget.select();
                }}
                onFocusOut={(e) => {
                    isEditing.current = false;
                    commit(e.currentTarget.value);
                }}
                onInput={(e) => {
                    const v = e.currentTarget.value;
                    const val = parseInt(v, 10);

                    if (isNaN(val) || val < 0) {
                        setText(v.substring(Math.max(0, v.length - 1), v.length));
                    } else if (val <= 10 && val * 10 <= max && v.length === 1) {
                        setText(v);
                    } else {
                        commit(v);
                        onAutoAdvance?.();
                    }
                }}
            />

            {
                /* not sure if i want this or not */
                /*
            <span className="select-none  text-faded px-0.5">{label}</span>
            <div className="flex flex-col justify-between">
                <HoldButton
                    tabIndex={-1}
                    onStep={() => step(1)}
                    className="h-full select-none px-1 pt-0.5 pb-0 leading-none border-none text-xs bg-transparent hover:bg-c-overlay1"
                >
                    ▲
                </HoldButton>
                <HoldButton
                    tabIndex={-1}
                    onStep={() => step(-1)}
                    className="h-full select-none px-1 pt-0 pb-0.5 leading-none border-none text-xs bg-transparent hover:bg-c-overlay1"
                >
                    ▼
                </HoldButton>
            </div>
            */ }
        </div>
    );
}

export function TimeInput({value, onChange, label, showSeconds = false, hour12 = false, className = ''}: TimeInputProps) {
    const hourRef = useRef<HTMLInputElement>(null);
    const minuteRef = useRef<HTMLInputElement>(null);
    const secondRef = useRef<HTMLInputElement>(null);
    const ampmRef = useRef<HTMLInputElement>(null);

    const h24 = value.getHours();
    const isPm = h24 >= 12;

    const focusHour = (e: MouseEvent) => {
        if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'BUTTON') {
            hourRef.current?.focus();
        }
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

    const advanceFromHour = () => { minuteRef.current?.focus(); };
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

    const sep = <span className="flex items-center select-none text-faded px-0.5">:</span>;

    return (
        <div className={`flex flex-row items-center input-like p-0 pr-1 ${className}`} onClick={focusHour}>
            {label && <div className="flex flex-1 items-center wsnw select-none px-1">{label}</div>}

            <Segment
                inputRef={hourRef}
                value={hour12 ? to12(h24) : h24}
                min={hour12 ? 1 : 0}
                max={hour12 ? 12 : 23}
                onChange={hour12 ? setHours12 : setHours}
                onAutoAdvance={advanceFromHour}
            />
            {sep}
            <Segment
                inputRef={minuteRef}
                value={value.getMinutes()}
                min={0}
                max={59}
                onChange={setMinutes}
                onAutoAdvance={advanceFromMinute}
            />
            {showSeconds && sep}
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
                    <button
                        tabIndex={-1}
                        className="px-1 border-none text-xs bg-transparent hover:bg-c-overlay1 select-none leading-none"
                        onClick={toggleAmPm}
                    >
                        ⇅
                    </button>
                </div>
            )}
        </div>
    );
}
