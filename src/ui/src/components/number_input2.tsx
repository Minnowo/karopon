import {useState, useRef, useEffect} from 'preact/hooks';

type Props = {
    className?: string;
    label: string;
    value: number;
    onValueChange: (value: number) => void;
    numberList?: number[];
    distinctNumberList?: boolean;
    step?: number;
    min?: number;
    max?: number;
};

export function NumberInput2(p: Props) {
    const intDelay = 500;
    const repSpeed = 150;
    const timeoutRef = useRef<number>(0);
    const intervalRef = useRef<number>(0);
    const valueRef = useRef<number>(p.value);
    const [open, setOpen] = useState<boolean>(false);

    const numberList: number[] | undefined = p.distinctNumberList
        ? [...new Set(p.numberList)].sort((a, b) => a - b)
        : p.numberList;

    useEffect(() => {
        valueRef.current = p.value;
    }, [p.value]);

    const stopHoldRepeat = () => {
        clearTimeout(timeoutRef.current);
        clearInterval(intervalRef.current);
    };

    const doInc = () => {
        const step = p.step === undefined ? 1 : p.step;
        if (p.max !== undefined && valueRef.current + step > p.max) {
            p.onValueChange(p.max);
            return;
        }
        p.onValueChange(valueRef.current + step);
    };

    const doDec = () => {
        const step = p.step === undefined ? 1 : p.step;
        if (p.min !== undefined && valueRef.current - step < p.min) {
            p.onValueChange(p.min);
            return;
        }
        p.onValueChange(valueRef.current - step);
    };

    return (
        <div className={`h-fit w-fit flex relative outline-none rounded-sm border border-c-yellow ${p.className}`}>
            <button className="border-none select-none" onClick={() => setOpen(!open)} onBlur={() => setOpen(false)}>
                {p.label}
            </button>
            <input
                type="text"
                inputmode="decimal"
                pattern="-?[0-9]*\.?[0-9]*$"
                className="pl-2 w-16 border-none focus:outline-none"
                value={p.value}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onInput={(e) => {
                    if (e === null || e.currentTarget.value.length <= 0) {
                        return;
                    }
                    if (e.currentTarget.value.endsWith('.')) {
                        if (e.currentTarget.value.indexOf('.') === e.currentTarget.value.length - 1) {
                            return;
                        }
                    }
                    const number = Number(e.currentTarget.value);

                    if (!isNaN(number)) {
                        if (number != p.value) {
                            p.onValueChange(number);
                        }
                    } else {
                        e.currentTarget.value = `${p.value}`;
                    }
                }}
            />
            <div className="flex flex-col w-6 justify-between">
                <button
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
                    className="select-none px-1 pb-1 pt-0 leading-none border-none text-xs hover:bg-c-l-black"
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
