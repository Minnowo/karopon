import {Dispatch, StateUpdater} from 'preact/hooks';
import {base} from '../api/api';
import {Footer} from '../components/footer';

interface Props {
    doRefresh: Dispatch<StateUpdater<number>>;
}
export function LoginPage({doRefresh}: Props) {
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
                alert('Login failed.');
                return;
            }

            window.location.href = '#events';
            doRefresh((x) => x + 1);
        } catch (err) {
            console.error(err);
            alert('Network error.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center align-middle h-screen">
            <div className="text-center font-bold mb-32">
                <h1>Karopon</h1>
                <br />

                <form encType="multipart/form-data" onSubmit={handleSubmit}>
                    <table className="table-auto table-padded">
                        <tbody className="text-right">
                            <tr title="Your username">
                                <td className="px-2">Username</td>
                                <td>
                                    <input type="text" name="pon_username" required />
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
                </form>
            </div>

            <div className="absolute bottom-0 w-full">
                <Footer />
            </div>
        </div>
    );
}
