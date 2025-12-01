import {base} from '../api/api';
import {Footer} from '../components/footer';
export function LoginPage() {
    return (
        <div className="flex flex-col items-center justify-center ">
            <div className="flex-grow">
                <br />
                <h1>Karopon</h1>
                <br />

                <form enctype="multipart/form-data" action={`${base}/api/login`} method="POST">
                    <table className="table-auto table-padded">
                        <tbody className="text-right">
                            <tr title="Your username">
                                <td className="px-2"> Username </td>
                                <td>
                                    {' '}
                                    <input type="text" name="pon_username" required />{' '}
                                </td>
                            </tr>

                            <tr title="Your password">
                                <td className="px-2"> Password </td>
                                <td>
                                    {' '}
                                    <input type="password" name="pon_password" required />{' '}
                                </td>
                            </tr>

                            <tr title="Login">
                                <td colspan={2}>
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
