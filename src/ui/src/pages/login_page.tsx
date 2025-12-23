import {Dispatch, StateUpdater, useRef} from 'preact/hooks';
import {GetApiBase, IsCrossOrigin, SetApiBase, SetAuthToken} from '../api/api';
import {ErrorDiv} from '../components/error_div';

type Props = {
    error: string | null;
    setErrorMsg: Dispatch<StateUpdater<string | null>>;
    doRefresh: () => void;
};
export function LoginDialog({error, setErrorMsg, doRefresh}: Props) {
    const serverInputRef = useRef<HTMLInputElement>(null);

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
                }
                doRefresh();
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setErrorMsg(err.message);
            } else {
                setErrorMsg(String(err));
            }
        }
    };

    return (
        <>
            <h1 className="mb-4">Karopon</h1>
            <form className="flex flex-col align-middle items-center" encType="multipart/form-data" onSubmit={handleSubmit}>
                <table className="table-auto table-padded mb-2">
                    <tbody className="text-right">
                        <tr title="Your username">
                            <td className="px-2">Username</td>
                            <td>
                                <input type="text" name="pon_username" required autofocus />
                            </td>
                        </tr>

                        <tr title="Your password">
                            <td className="px-2">Password</td>
                            <td>
                                <input type="password" name="pon_password" required />
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
                                    <summary className="cursor-pointer text-sm font-semibold">Advanced Options</summary>

                                    <div className="flex flex-col mt-2">
                                        <div className="flex flex-row  items-center">
                                            <span className="mr-2"> Server </span>
                                            <input
                                                className="w-full"
                                                ref={serverInputRef}
                                                type="text"
                                                placeholder="Server URL (empty=default)"
                                                value={GetApiBase()}
                                            />
                                        </div>
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
        <div className="flex flex-col items-center text-center font-bold my-32">
            <LoginDialog {...p} />
        </div>
    );
}
