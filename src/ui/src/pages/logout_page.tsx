import {useEffect} from 'preact/hooks';
import {LocalClearAll} from '../utils/localstate';

export function LogoutPage() {
    useEffect(() => {
        LocalClearAll();
        window.location.href = '/api/logout';
    }, []);

    return null;
}
