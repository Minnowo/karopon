import {ApiError} from '../api/api';

// NoServerMessage is shown for an API error that came without a message, e.g. a proxy's error page.
export const NoServerMessage = 'The server could not finish this. Try again.';

// PageErrorMessage returns the message to show for e on a page that has no
// fields to put field errors on: the field messages themselves when there are
// any (the generic "check the highlighted fields" would point at nothing),
// else the server's message, else null.
export const PageErrorMessage = (e: ApiError): string | null => {
    const fieldMessages = [...e.fieldErrors().values()].filter((m) => m.trim() !== '');
    if (fieldMessages.length > 0) {
        return fieldMessages.join(' ');
    }
    return e.userMessage();
};

// ErrorText returns the message to show for any caught error: the server's message for an
// API error (never the raw request line), else the error's own message.
export const ErrorText = (e: unknown): string => {
    if (e instanceof ApiError) {
        return PageErrorMessage(e) ?? NoServerMessage;
    }
    if (e instanceof Error) {
        return e.message;
    }
    return `An unknown error occurred: ${e}`;
};

export const GetErrorHandler =
    (setErrorMsgFunc: (msg: string | null) => void, doRefresh: () => void): ((e: unknown) => void) =>
    (e: unknown) => {
        if (e instanceof ApiError) {
            setErrorMsgFunc(ErrorText(e));
            if (e.isUnauthorizedError()) {
                doRefresh();
            }
        } else if (e instanceof Error) {
            setErrorMsgFunc(e.message);
        } else {
            setErrorMsgFunc(`An unknown error occurred: ${e}`);
        }
    };

// RefreshOnUnauthorized returns a catch handler for a save whose form shows
// the error itself: on a 401 it starts the logged-out flow with doRefresh,
// then rethrows so the form still sees the error.
export const RefreshOnUnauthorized =
    (doRefresh: () => void): ((e: unknown) => never) =>
    (e: unknown) => {
        if (e instanceof ApiError && e.isUnauthorizedError()) {
            doRefresh();
        }
        throw e;
    };
