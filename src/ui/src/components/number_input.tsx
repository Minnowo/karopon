import {useState, useRef, useEffect} from 'preact/hooks';
import {JSX} from 'preact';

type Props = {
    className?: string;
    innerClassName?: string;
    innerTabIndex?: number;
    label?: string;
    value: number;
    onValueChange: (value: number) => void;
    numberList?: number[];
    distinctNumberList?: boolean;
    step?: number;
    min?: number;
    max?: number;
    round?: number;
    disabled?: boolean;
};

export function NumberInput({max = 1_000_000_000, ...p}: Props) {
    const intDelay = 500;
    const repSpeed = 150;
    const timeoutRef = useRef<number>(0);
    const intervalRef = useRef<number>(0);
    const valueRef = useRef<number>(p.value);
    const [open, setOpen] = useState<boolean>(false);

    const numberList: number[] | undefined = p.distinctNumberList
        ? [...new Set(p.numberList)].sort((a, b) => a - b)
        : p.numberList;

    const className = p.className !== undefined ? p.className : '';
    const innerClassName = p.innerClassName !== undefined ? p.innerClassName : 'w-12';

    const value = (() => {
        const strValue = p.value.toString();

        if (p.round !== undefined) {
            if (strValue.indexOf('.') !== -1) {
                return p.value.toFixed(p.round);
            }
        }
        return `${p.value}`;
    })();

    useEffect(() => {
        valueRef.current = p.value;
    }, [p.value]);

    const stopHoldRepeat = () => {
        clearTimeout(timeoutRef.current);
        clearInterval(intervalRef.current);
    };

    const doInc = () => {
        if (p.disabled) {
            return;
        }
        const step = p.step === undefined ? 1 : p.step;
        if (max !== undefined && valueRef.current + step > max) {
            p.onValueChange(max);
            return;
        }
        p.onValueChange(valueRef.current + step);
    };

    const doDec = () => {
        if (p.disabled) {
            return;
        }
        const step = p.step === undefined ? 1 : p.step;
        if (p.min !== undefined && valueRef.current - step < p.min) {
            p.onValueChange(p.min);
            return;
        }
        p.onValueChange(valueRef.current - step);
    };

    return (
        <div
            aria-disabled={p.disabled}
            className={`flex flex-row relative outline-none rounded-sm border border-c-yellow whitespace-nowrap input-like px-0 py-0 ${className}`}
        >
            {p.label && (
                <button
                    tabindex={-1}
                    className="border-none select-none rounded-r-none pr-1"
                    onClick={() => !p.disabled && setOpen(!open)}
                    onBlur={() => setOpen(false)}
                >
                    {p.label}
                </button>
            )}
            <input
                tabindex={p.innerTabIndex}
                className={`${innerClassName} pl-1 border-none focus:outline-none rounded-r-none`}
                type="text"
                inputmode="decimal"
                pattern="-?[0-9]*\.?[0-9]*$"
                value={value}
                onFocus={() => !p.disabled && setOpen(true)}
                onBlur={() => setOpen(false)}
                disabled={p.disabled}
                onInput={(e: JSX.TargetedInputEvent<HTMLInputElement>) => {
                    if (e === null || e.currentTarget.value.length <= 0) {
                        return;
                    }
                    if (e.currentTarget.value.endsWith('.')) {
                        if (e.currentTarget.value.indexOf('.') === e.currentTarget.value.length - 1) {
                            return;
                        }
                    }
                    const number = Number(e.currentTarget.value);

                    if (isNaN(number)) {
                        e.currentTarget.value = `${p.value}`;
                        return;
                    }
                    if (number === p.value) {
                        return;
                    }
                    if (max !== undefined && number > max) {
                        p.onValueChange(max);
                    } else if (p.min !== undefined && number < p.min) {
                        p.onValueChange(p.min);
                    } else {
                        p.onValueChange(number);
                    }
                }}
            />
            <div className="flex flex-col justify-between">
                <button
                    disabled={p.disabled}
                    tabindex={-1}
                    className="select-none px-1 pt-1 pb-0 leading-none border-none text-xs hover:bg-c-l-black"
                    onPointerUp={stopHoldRepeat}
                    onPointerLeave={stopHoldRepeat}
                    onPointerCancel={stopHoldRepeat}
                    onMouseUp={() => stopHoldRepeat()}
                    onPointerDown={() => {
                        doInc();
                        timeoutRef.current = setTimeout(() => {
                            intervalRef.current = setInterval(() => {
                                doInc();
                            }, repSpeed);
                        }, intDelay);
                    }}
                >
                    ▲
                </button>
                <button
                    disabled={p.disabled}
                    tabindex={-1}
                    className="select-none px-1 pt-0 pb-1 leading-none border-none text-xs hover:bg-c-l-black"
                    onPointerUp={stopHoldRepeat}
                    onPointerLeave={stopHoldRepeat}
                    onPointerCancel={stopHoldRepeat}
                    onMouseUp={() => stopHoldRepeat()}
                    onPointerDown={() => {
                        doDec();
                        timeoutRef.current = setTimeout(() => {
                            intervalRef.current = setInterval(() => {
                                doDec();
                            }, repSpeed);
                        }, intDelay);
                    }}
                >
                    ▼
                </button>
            </div>
            {open && numberList !== undefined && (
                <div className="absolute left-24 top-full z-50">
                    {numberList.map((limit: number) => {
                        return (
                            <div
                                className="border px-0.5 w-15 bg-c-black hover:bg-c-l-black"
                                key={limit}
                                onMouseDown={() => p.onValueChange(limit)}
                            >
                                {limit}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
