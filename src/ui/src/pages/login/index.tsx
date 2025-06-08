import {base} from '../../api/api';
export function LoginPage() {
    return (
        <div class="flex flex-col items-center justify-center ">
            <br />
            <h1>Karopon</h1>
            <br />

            <form enctype="multipart/form-data" action={`${base}/api/login`} method="POST">
                <table class="table-auto table-padded">
                    <tbody class="text-right">
                        <tr title="Your username">
                            <td class="px-2"> Username </td>
                            <td>
                                {' '}
                                <input type="text" name="pon_username" required />{' '}
                            </td>
                        </tr>

                        <tr title="Your password">
                            <td class="px-2"> Password </td>
                            <td>
                                {' '}
                                <input type="password" name="pon_password" required />{' '}
                            </td>
                        </tr>

                        <tr title="Login">
                            <td colspan={2}>
                                <input class="w-full" type="submit" value="Login" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </form>
        </div>
    );
}
