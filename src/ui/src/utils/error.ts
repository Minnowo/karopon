import {ApiError} from '../api/api';

export const GetErrorHandler =
    (setErrorMsgFunc: (msg: string | null) => void, doRefresh: () => void): ((e: unknown) => void) =>
    (e: unknown) => {
        if (e instanceof ApiError) {
            setErrorMsgFunc(e.message);
            if (e.isUnauthorizedError()) {
                doRefresh();
            }
        } else if (e instanceof Error) {
            setErrorMsgFunc(e.message);
        } else {
            setErrorMsgFunc(`An unknown error occurred: ${e}`);
        }
    };
