import {useCallback, useEffect, useRef, useState} from 'preact/hooks';
import {HoldButton} from './hold_button';

type FloatInputProps = {
    className?: string;
    innerClassName?: string;
    buttonClassName?: string;
    innerTabIndex?: number;
    label?: string;
    value: number;
    onValueChange: (value: number) => void;
    numberList?: number[];
    step?: number;
    precision?: number;
    min?: number;
    max?: number;
    disabled?: boolean;
};

const NUMBER_REGEX = /^-?\d*(?:\.\d*)?$/;

export function NumberInput({
    value,
    onValueChange,
    label = undefined,
    step = 1,
    precision = 2,
    min = -Infinity,
    max = 1_000_000,
    disabled = false,
    className = '',
    innerClassName = 'w-12',
    buttonClassName = '',
    innerTabIndex = undefined,
}: FloatInputProps) {
    const round = useCallback(
        (v: number) => {
            const factor = 10 ** precision;
            return Math.round(v * factor) / factor;
        },
        [precision]
    );

    const [text, setText] = useState(round(value).toString());

    const isEditing = useRef<boolean>(false);

    useEffect(() => {
        if (isEditing.current) {
            setText(value.toString());
        } else {
            setText(round(value).toString());
        }
    }, [value, round]);

    const commitValue = (v: number) => {
        const clamped = Math.min(max, Math.max(min, v));
        const rounded = round(clamped);

        setText(rounded.toString());
        onValueChange(rounded);
    };

    const tryEmit = (raw: string) => {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) {
            onValueChange(parsed);
        }
    };

    const handleBlur = () => {
        const parsed = Number(text);
        if (!Number.isNaN(parsed)) {
            commitValue(parsed);
        } else {
            setText(value.toString());
        }
    };

    const stepBy = (dir: 1 | -1) => {
        const base = Number(text);
        const current = Number.isNaN(base) ? value : base;

        commitValue(current + step * dir);
    };

    return (
        <div
            aria-disabled={disabled}
            className={`flex flex-row relative outline-none rounded-sm border border-c-yellow whitespace-nowrap input-like px-0 py-0 ${className}`}
        >
            {label && <div className="flex items-center select-none pr-1"> {label} </div>}
            <input
                tabindex={innerTabIndex}
                className={`${innerClassName} pl-1 border-none focus:outline-none`}
                type="text"
                inputMode="decimal"
                disabled={disabled}
                value={text}
                onFocusIn={() => (isEditing.current = true)}
                onFocusOut={() => (isEditing.current = false)}
                onInput={(e) => {
                    const v = e.currentTarget.value;

                    if (!NUMBER_REGEX.test(v)) {
                        e.currentTarget.value = text;
                        return;
                    }

                    setText(v);
                    tryEmit(v);
                }}
                onBlur={handleBlur}
            />

            <div className={`flex flex-col justify-between ${buttonClassName}`}>
                <HoldButton
                    tabIndex={-1}
                    disabled={disabled}
                    onStep={() => stepBy(1)}
                    className="select-none px-1 pt-1 pb-0 leading-none border-none text-xs hover:bg-c-l-black"
                >
                    ▲
                </HoldButton>
                <HoldButton
                    tabIndex={-1}
                    disabled={disabled}
                    onStep={() => stepBy(-1)}
                    className="select-none px-1 pt-0 pb-1 leading-none border-none text-xs hover:bg-c-l-black"
                >
                    ▼
                </HoldButton>
            </div>
        </div>
    );
}
