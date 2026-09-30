import {useCallback, useEffect, useId, useRef, useState} from 'preact/hooks';
import {HoldButton} from './hold_button';
import {DownArrow, UpArrow} from './svg';

type FloatInputProps = {
    className?: string;
    innerClassName?: string;
    buttonClassName?: string;
    innerTabIndex?: number;
    id?: string;
    label?: string;
    value: number;
    onValueChange: (value: number) => void;
    numberList?: number[];
    step?: number;
    precision?: number;
    min?: number;
    max?: number;
    disabled?: boolean;
    labelOnLeftSide?: boolean;
};

const NUMBER_REGEX = /^-?\d*(?:\.\d*)?$/;

export function NumberInput({
    value,
    onValueChange,
    id = undefined,
    label = undefined,
    step = 1,
    precision = 3,
    min = -Infinity,
    max = 1_000_000_000,
    labelOnLeftSide = true,
    disabled = false,
    className = '',
    innerClassName = 'w-16',
    buttonClassName = '',
    innerTabIndex = undefined,
}: FloatInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const generatedId = useId();
    const inputId = id ?? generatedId;
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
        <div aria-disabled={disabled} className={`flex flex-row relative input-like p-0 ${className}`}>
            {labelOnLeftSide && label && (
                <label className="flex items-center wsnw select-none pl-2 pr-1" htmlFor={inputId}>
                    {label}
                </label>
            )}
            <input
                ref={inputRef}
                id={inputId}
                tabindex={innerTabIndex}
                className={`${innerClassName} pl-2 pr-0 border-none focus:outline-none`}
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
            {!labelOnLeftSide && label && (
                <label className="flex items-center wsnw select-none pl-1 pr-0.5" htmlFor={inputId}>
                    {label}
                </label>
            )}

            <div className={`flex flex-col justify-between ${buttonClassName}`}>
                <HoldButton
                    tabIndex={-1}
                    disabled={disabled}
                    onStep={() => stepBy(1)}
                    className="h-full select-none px-1 pt-0.5 pb-0 leading-none border-none text-xs bg-transparent hover:bg-c-surface-container-5"
                    ariaLabel={label ? `Increase ${label}` : 'Increase value'}
                >
                    {UpArrow}
                </HoldButton>
                <HoldButton
                    tabIndex={-1}
                    disabled={disabled}
                    onStep={() => stepBy(-1)}
                    className="h-full select-none px-1 pt-0 pb-0.5 leading-none border-none text-xs bg-transparent hover:bg-c-surface-container-5"
                    ariaLabel={label ? `Decrease ${label}` : 'Decrease value'}
                >
                    {DownArrow}
                </HoldButton>
            </div>
        </div>
    );
}
