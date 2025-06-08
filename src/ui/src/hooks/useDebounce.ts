import {useEffect, useRef, useCallback} from 'preact/hooks';

export function useDebouncedCallback<T extends (...args: any[]) => void>(
    callback: T,
    delay: number
): [(...args: Parameters<T>) => void, () => void] {
    const functionTimeoutHandler = useRef<ReturnType<typeof setTimeout>>(null);

    const abort = () => {
        if (functionTimeoutHandler.current) {
            clearTimeout(functionTimeoutHandler.current);
        }
    };

    const debounce = useCallback(
        (...args: Parameters<T>) => {
            if (functionTimeoutHandler.current) {
                clearTimeout(functionTimeoutHandler.current);
            }
            functionTimeoutHandler.current = setTimeout(() => callback(...args), delay);
        },
        [callback, delay]
    );

    useEffect(() => abort, []);

    return [debounce, abort];
}
