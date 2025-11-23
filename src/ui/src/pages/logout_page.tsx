import {useEffect} from 'preact/hooks';

export function LogoutPage() {
    useEffect(() => {
        window.location.href = '/api/logout';
    }, []);

    return null;
}
