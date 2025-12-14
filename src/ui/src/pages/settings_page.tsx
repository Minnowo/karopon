import {useEffect, useRef, useState} from 'preact/hooks';
import {BaseState} from '../state/basestate';
import {DoRender} from '../hooks/doRender';
import {TblUpdateUser, TblUser} from '../api/types';
import {NumberInput} from '../components/number_input';
import {CalorieFormula} from '../utils/calories';
import {FlipSwitch} from '../components/flip_switch';
import {ApiUpdateUser} from '../api/api';
import {ErrorDiv} from '../components/error_div';

export function SettingsPage(state: BaseState) {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const userRef = useRef({...state.user});

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const render = DoRender();

    useEffect(() => {
        userRef.current = {...state.user};
    }, [state.user]);

    function update<K extends keyof TblUser>(key: K, value: TblUser[K]) {
        userRef.current[key] = value;
        render();
    }

    function save() {
        setErrorMsg(null);

        if (userRef.current.name.length > 20) {
            setErrorMsg('Username must be less than 20 characters!');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg('New password does not match the confirm password!');
            return;
        }
        if (newPassword !== '') {
            if (newPassword.length > 72) {
                setErrorMsg('Password must be less than 72 characters long.');
                return;
            }
            if (newPassword.length < 1) {
                setErrorMsg('Password must be at least 1 character long.');
                return;
            }
        }

        const uuser: TblUpdateUser = {
            user: userRef.current,
            new_password: newPassword,
        };

        ApiUpdateUser(uuser)
            .then((u: TblUser) => {
                state.setUser(u);
                setIsEditing(false);
                setErrorMsg(null);
            })
            .catch((e: Error) => setErrorMsg(e.message));
    }

    return (
        <main className="flex flex-col space-y-4 sm:px-16 lg:px-32">
            <div className="w-full flex justify-evenly my-4">
                <button
                    className={`w-48 ${isEditing && 'bg-c-l-red'}`}
                    onClick={() => {
                        setIsEditing((x) => !x);
                    }}
                >
                    {!isEditing ? 'Change Settings' : 'Cancel'}
                </button>
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            <div>
                <div className="font-bold">Username:</div>
                <input
                    className="w-full"
                    type="text"
                    value={userRef.current.name}
                    disabled={!isEditing}
                    onInput={(e) => update('name', (e.target as HTMLInputElement).value)}
                />
            </div>

            {isEditing && (
                <>
                    <div>
                        <div className="font-bold">Change Password:</div>
                        <input
                            className="w-full"
                            type="password"
                            maxlength={72}
                            value={newPassword}
                            onInput={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                        />
                    </div>
                    <div>
                        <div className="font-bold">Confirm Password:</div>
                        <input
                            className="w-full"
                            type="password"
                            maxlength={72}
                            value={confirmPassword}
                            onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                        />
                    </div>
                </>
            )}

            {state.user.show_diabetes && (
                <>
                    <NumberInput
                        className="w-full input-like"
                        innerClassName="w-full text-right"
                        label="Target Blood Sugar"
                        value={userRef.current.target_blood_sugar}
                        onValueChange={(value: number) => update('target_blood_sugar', value)}
                        disabled={!isEditing}
                    />
                    <NumberInput
                        className="w-full input-like"
                        innerClassName="w-full text-right"
                        label="Insulin Sensitivity Factor"
                        value={userRef.current.insulin_sensitivity_factor}
                        onValueChange={(value: number) => update('insulin_sensitivity_factor', value)}
                        disabled={!isEditing}
                    />
                </>
            )}
            <NumberInput
                className="w-full input-like"
                innerClassName="w-full text-right"
                label="Event History Fetch Limit"
                value={userRef.current.event_history_fetch_limit}
                onValueChange={(value: number) => update('event_history_fetch_limit', value)}
                disabled={!isEditing}
            />
            <NumberInput
                className="w-full input-like"
                innerClassName="w-full text-right"
                label="Session Expire Time (in Seconds)"
                value={userRef.current.session_expire_time_seconds}
                onValueChange={(value: number) => update('session_expire_time_seconds', value)}
                disabled={!isEditing}
            />

            <label className="flex items-center justify-between cursor-pointer">
                <span className="text-lg font-medium">Dark Mode</span>
                <FlipSwitch
                    disabled={!isEditing}
                    value={userRef.current.dark_mode}
                    onValueChanged={(v) => update('dark_mode', v)}
                />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
                <span className="text-lg font-medium">Show Diabetes Features</span>
                <FlipSwitch
                    disabled={!isEditing}
                    value={userRef.current.show_diabetes}
                    onValueChanged={(v) => update('show_diabetes', v)}
                />
            </label>

            <div>
                <div className="font-bold">Caloric Calculation Method</div>
                <select
                    className="w-full"
                    disabled={!isEditing}
                    value={userRef.current.caloric_calc_method}
                    onInput={(e) => update('caloric_calc_method', (e.target as HTMLSelectElement).value)}
                >
                    {[CalorieFormula.Auto, CalorieFormula.Atwater, CalorieFormula.AtwaterNoFibre].map((x) => (
                        <option key={x} value={x}>
                            {x}
                        </option>
                    ))}
                </select>
            </div>

            {isEditing && (
                <input
                    className="w-full my-1 sm:ml-auto sm:max-w-32 text-c-l-green"
                    type="submit"
                    value="Save Settings"
                    onClick={save}
                />
            )}
        </main>
    );
}
