import {useCallback, useState} from 'preact/hooks';

export function DoRender(): () => void {
    const [, setTick] = useState<number>(0);

    return useCallback(() => {
        setTick((t) => t + 1);
    }, []);
}
