import {Dispatch, StateUpdater, useId, useRef} from 'preact/hooks';
import {GetApiBase, IsCrossOrigin, SetApiBase, SetAuthToken} from '../api/api';
import {ErrorDiv, ErrorDivMsg} from '../components/error_div';

type Props = {
    error: ErrorDivMsg | null;
    setErrorMsg: Dispatch<StateUpdater<ErrorDivMsg | null>>;
    doRefresh: () => void;
};
export function LoginDialog({error, setErrorMsg, doRefresh}: Props) {
    const serverInputRef = useRef<HTMLInputElement>(null);
    const usernameId = useId();
    const passwordId = useId();

    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        if (serverInputRef.current?.value !== undefined) {
            SetApiBase(serverInputRef.current?.value);
        }

        const form = e.currentTarget as HTMLFormElement;
        const formData = new FormData(form);
        const wantToken = IsCrossOrigin(GetApiBase());

        if (wantToken) {
            formData.set('pon_token_type', 'token');
        }
        try {
            const res = await fetch(`${GetApiBase()}/api/login`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                setErrorMsg(await res.text());
            } else {
                if (wantToken) {
                    const js: {token: string; expires: number} = await res.json();
                    SetAuthToken(js.token);
                } else {
                    SetAuthToken('');
                }
                doRefresh();
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setErrorMsg(err);
            } else {
                setErrorMsg(String(err));
            }
        }
    };

    return (
        <>
            <h1>Karopon</h1>
            <form className="flex flex-col align-middle items-center" encType="multipart/form-data" onSubmit={handleSubmit}>
                <table className="table-auto table-padded mb-2">
                    <tbody className="text-right">
                        <tr title="Your username">
                            <td className="px-2">
                                <label htmlFor={usernameId}>Username</label>
                            </td>
                            <td>
                                <input id={usernameId} type="text" name="pon_username" required autofocus />
                            </td>
                        </tr>

                        <tr title="Your password">
                            <td className="px-2">
                                <label htmlFor={passwordId}>Password</label>
                            </td>
                            <td>
                                <input id={passwordId} type="password" name="pon_password" required />
                            </td>
                        </tr>

                        <tr title="Login">
                            <td colSpan={2}>
                                <input className="w-full" type="submit" value="Login" />
                            </td>
                        </tr>

                        <tr>
                            <td colSpan={2} className="text-left">
                                <details className="w-full">
                                    <summary className="cursor-pointer">Advanced Options</summary>

                                    <div className="flex flex-col pt-2">
                                        <label className="flex flex-row items-center gap-2">
                                            Server
                                            <input
                                                className="w-full"
                                                ref={serverInputRef}
                                                type="text"
                                                placeholder="Server URL (empty=default)"
                                                value={GetApiBase()}
                                            />
                                        </label>
                                    </div>
                                </details>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <ErrorDiv errorMsg={error} />
            </form>
        </>
    );
}

export function LoginPage(p: Props) {
    return (
        <div className="flex flex-col items-center text-center my-32">
            <LoginDialog {...p} />
        </div>
    );
}
