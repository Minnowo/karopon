import {useEffect, useId, useRef, useState} from 'preact/hooks';
import {BaseState} from '../state/basestate';
import {DoRender} from '../hooks/doRender';
import {TblUpdateUser, TblUser, UserTimeFormat} from '../api/types';
import {NumberInput} from '../components/number_input';
import {CalorieFormula} from '../utils/calories';
import {ApiError, ApiUpdateUser} from '../api/api';
import {ErrorDiv, ErrorDivMsg} from '../components/error_div';
import {FieldError} from '../components/field_error';
import {RefreshOnUnauthorized} from '../utils/error';

export function SettingsPage(state: BaseState) {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const userRef = useRef({...state.user});

    const usernameId = useId();
    const newPasswordId = useId();
    const confirmPasswordId = useId();
    const themeId = useId();
    const calorieMethodId = useId();
    const customCssId = useId();

    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(new Map());
    const [saving, setSaving] = useState<boolean>(false);

    // Field ids by the server's JSON Pointer, in page order.
    const fieldIds = new Map<string, string>([
        ['#/user/name', usernameId],
        ['#/new_password', newPasswordId],
        ['#/user/custom_css', customCssId],
        // Not a server field: the confirm password match is checked in this page.
        ['confirm_password', confirmPasswordId],
    ]);

    // invalidProps returns the aria attributes for the field at pointer.
    const invalidProps = (pointer: string) => ({
        'aria-invalid': fieldErrors.has(pointer) || undefined,
        'aria-describedby': fieldErrors.has(pointer) ? `${fieldIds.get(pointer)}-error` : undefined,
    });

    // errorFor renders the server's message for the field at pointer.
    const errorFor = (pointer: string) => <FieldError id={`${fieldIds.get(pointer)}-error`} message={fieldErrors.get(pointer)} />;

    const clearFieldError = (pointer: string) => {
        setFieldErrors((prev) => {
            if (!prev.has(pointer)) {
                return prev;
            }
            const next = new Map(prev);
            next.delete(pointer);
            return next;
        });
    };
    const render = DoRender();

    useEffect(() => {
        userRef.current = {...state.user};
    }, [state.user]);

    function update<K extends keyof TblUser>(key: K, value: TblUser[K]) {
        userRef.current[key] = value;
        render();
    }

    function save() {
        if (saving) {
            return;
        }
        setErrorMsg(null);
        setFieldErrors(new Map());

        // The confirm field never reaches the server, so the match is checked here.
        if (newPassword !== confirmPassword) {
            setFieldErrors(new Map([['confirm_password', 'This does not match the new password. Type it again.']]));
            document.getElementById(confirmPasswordId)?.focus();
            return;
        }

        const uuser: TblUpdateUser = {
            user: userRef.current,
            new_password: newPassword,
        };

        setSaving(true);
        ApiUpdateUser(uuser)
            .then((u: TblUser) => {
                state.setUser(u);
                setIsEditing(false);
                setErrorMsg(null);
            })
            .catch(RefreshOnUnauthorized(state.doRefresh))
            .catch((e: unknown) => {
                if (!(e instanceof ApiError)) {
                    setErrorMsg(e instanceof Error ? e : String(e));
                    return;
                }
                const errs = e.fieldErrors();
                setFieldErrors(errs);
                setErrorMsg(e);
                for (const [pointer, id] of fieldIds) {
                    if (errs.has(pointer)) {
                        document.getElementById(id)?.focus();
                        break;
                    }
                }
            })
            .finally(() => setSaving(false));
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="w-full flex justify-evenly my-4">
                <button
                    className="w-48"
                    onClick={() => {
                        setIsEditing((x) => !x);
                    }}
                >
                    {!isEditing ? 'Change Settings' : 'Cancel'}
                </button>
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor={usernameId}>Username</label>
                <input
                    id={usernameId}
                    className="w-full"
                    type="text"
                    value={userRef.current.name}
                    disabled={!isEditing}
                    {...invalidProps('#/user/name')}
                    onInput={(e) => {
                        update('name', (e.target as HTMLInputElement).value);
                        clearFieldError('#/user/name');
                    }}
                />
                {errorFor('#/user/name')}
            </div>

            {isEditing && (
                <>
                    <div className="flex flex-col gap-1">
                        <label htmlFor={newPasswordId}>Change Password</label>
                        <input
                            id={newPasswordId}
                            className="w-full"
                            type="password"
                            maxlength={72}
                            value={newPassword}
                            {...invalidProps('#/new_password')}
                            onInput={(e) => {
                                setNewPassword((e.target as HTMLInputElement).value);
                                clearFieldError('#/new_password');
                            }}
                        />
                        {errorFor('#/new_password')}
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor={confirmPasswordId}>Confirm Password</label>
                        <input
                            id={confirmPasswordId}
                            className="w-full"
                            type="password"
                            maxlength={72}
                            value={confirmPassword}
                            {...invalidProps('confirm_password')}
                            onInput={(e) => {
                                setConfirmPassword((e.target as HTMLInputElement).value);
                                clearFieldError('confirm_password');
                            }}
                        />
                        {errorFor('confirm_password')}
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
                label="Event Log Trailing Rows"
                value={userRef.current.event_log_trailing_rows}
                onValueChange={(value: number) => update('event_log_trailing_rows', value)}
                disabled={!isEditing}
                min={1}
                step={1}
            />
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
                label="Timespan History Fetch Limit"
                value={userRef.current.timespan_history_fetch_limit}
                onValueChange={(value: number) => update('timespan_history_fetch_limit', value)}
                disabled={!isEditing}
            />
            <NumberInput
                className="w-full input-like"
                innerClassName="w-full text-right"
                label="Session Expire Time (in Hours)"
                value={userRef.current.session_expire_time_seconds / (60 * 60)}
                onValueChange={(value: number) => update('session_expire_time_seconds', value * 60 * 60)}
                disabled={!isEditing}
            />
            <NumberInput
                className="w-full input-like"
                innerClassName="w-full text-right"
                label="Day Start Offset (in Hours)"
                value={userRef.current.day_time_offset_seconds / (60 * 60)}
                onValueChange={(value: number) => update('day_time_offset_seconds', value * 60 * 60)}
                disabled={!isEditing}
                min={0}
                max={23}
                step={1}
            />

            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={userRef.current.show_diabetes}
                    onChange={(e) => update('show_diabetes', e.currentTarget.checked)}
                />
                <span>Show Diabetes Features</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={userRef.current.time_format === UserTimeFormat.Hour24}
                    onChange={(e) =>
                        update('time_format', e.currentTarget.checked ? UserTimeFormat.Hour24 : UserTimeFormat.Hour12)
                    }
                />
                <span>Use 24 Hour Time</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={userRef.current.fill_eventlog_from_last}
                    onChange={(e) => update('fill_eventlog_from_last', e.currentTarget.checked)}
                />
                <span>Fill Events From Last Instance</span>
            </label>

            <div className="flex flex-col gap-1">
                <label htmlFor={themeId}>Color Theme</label>
                <select
                    id={themeId}
                    className="w-full"
                    disabled={!isEditing}
                    value={userRef.current.theme}
                    onInput={(e) => update('theme', (e.target as HTMLSelectElement).value)}
                >
                    {['dark', 'light'].map((x) => (
                        <option key={x} value={x}>
                            {x}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor={calorieMethodId}>Caloric Calculation Method</label>
                <select
                    id={calorieMethodId}
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

            <label className="flex flex-col gap-1">
                Custom CSS
                <textarea
                    id={customCssId}
                    className="font-mono"
                    rows={8}
                    disabled={!isEditing}
                    value={userRef.current.custom_css}
                    placeholder="Applied to every page as-is (optional). Add ?nocss to the URL to turn it off."
                    {...invalidProps('#/user/custom_css')}
                    onInput={(e) => {
                        update('custom_css', e.currentTarget.value);
                        clearFieldError('#/user/custom_css');
                    }}
                />
            </label>
            {errorFor('#/user/custom_css')}

            <ErrorDiv errorMsg={errorMsg} />

            {isEditing && (
                <input
                    className="w-full sm:ml-auto sm:max-w-32 btn-success"
                    type="submit"
                    value="Save Settings"
                    aria-disabled={saving || undefined}
                    onClick={save}
                />
            )}
        </div>
    );
}
