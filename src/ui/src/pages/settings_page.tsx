import {useEffect} from 'preact/hooks';
import {BaseState} from '../state/basestate';

export function SettingsPage(state: BaseState) {
    useEffect(() => {
        console.log(state.settings);
    }, []);

    return (
        <main className="flex flex-col">
            <span>SETTINGS</span>
            <span>ID: {state.settings?.id}</span>
            <span>DARK_MODE: {state.settings?.dark_mode ? 'TRUE' : 'FALSE'}</span>
            <span>INSULIN_SENSITIVITY_FACTOR: {state.settings?.insulin_sensitivity_factor ? 'TRUE' : 'FALSE'}</span>
            <span>SHOW_DIABETES: {state.settings?.show_diabetes ? 'TRUE' : 'FALSE'}</span>
            <span>USER_ID: {state.settings?.user_id}</span>
        </main>
    );
}
