import {useEffect, useRef} from 'preact/hooks';
import {ComponentChildren} from 'preact';

type HoldButtonProps = {
    onStep: () => void;
    disabled?: boolean;
    tabIndex?: number;
    className?: string;
    children: ComponentChildren;
};

export const HoldButton = ({onStep, disabled, tabIndex, className, children}: HoldButtonProps) => {
    const intervalRef = useRef<number | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const onStepRef = useRef(onStep);

    useEffect(() => {
        onStepRef.current = onStep;
    }, [onStep]);

    const clear = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const handleMouseDown = () => {
        if (disabled) {
            return;
        }

        onStepRef.current();

        timeoutRef.current = window.setTimeout(() => {
            intervalRef.current = window.setInterval(() => onStepRef.current(), 100);
        }, 300);
    };

    return (
        <button
            tabindex={tabIndex}
            type="button"
            disabled={disabled}
            className={className}
            onPointerDown={handleMouseDown}
            onPointerUp={clear}
            onPointerLeave={clear}
            onPointerCancel={clear}
            onMouseLeave={clear}
            onTouchEnd={clear}
        >
            {children}
        </button>
    );
};
