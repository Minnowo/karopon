import {Dispatch, StateUpdater} from 'preact/hooks';
import {base} from '../api/api';
import {ErrorDiv} from '../components/error_div';

type Props = {
    error: string | null;
    setErrorMsg: Dispatch<StateUpdater<string | null>>;
    doRefresh: () => void;
};

export function LoginDialog({error, setErrorMsg, doRefresh}: Props) {
    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        const form = e.currentTarget as HTMLFormElement;
        const formData = new FormData(form);

        try {
            const res = await fetch(`${base}/api/login`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                setErrorMsg(await res.text());
            } else {
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
                <table className="table-auto table-padded">
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
