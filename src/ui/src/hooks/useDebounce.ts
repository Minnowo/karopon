import { useEffect, useRef } from "preact/hooks";

export function useDebouncedCallback<T extends (...args: any[]) => void>(
    callback: T,
    delay: number,
): (...args: Parameters<T>) => void {
    const functionTimeoutHandler = useRef<ReturnType<typeof setTimeout>>(null);

    useEffect(
        () => () => {
            if (functionTimeoutHandler.current) {
                clearTimeout(functionTimeoutHandler.current);
            }
        },
        [],
    );

    return (...args: Parameters<T>) => {
        if (functionTimeoutHandler.current) {
            clearTimeout(functionTimeoutHandler.current);
        }
        functionTimeoutHandler.current = setTimeout(
            () => callback(...args),
            delay,
        );
    };
}
