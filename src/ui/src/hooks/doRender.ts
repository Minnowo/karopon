import {useState} from 'preact/hooks';

export function DoRender(): () => void {
    const [, setRender] = useState<number>(0);

    return () => setRender((x) => x + 1);
}
