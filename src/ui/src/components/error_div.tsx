// The alert box that shows an error to the user (docs/api-errors.md).

import {ApiError} from '../api/api';
import {NoServerMessage} from '../utils/error';

export type ErrorDivMsg = Error[] | Error | string;

type ErrorDivProps = {
    errorMsg: ErrorDivMsg | null;
    className?: string;
};

// userMessage returns the text to show for error.
function userMessage(error: ErrorDivMsg): string {
    if (Array.isArray(error)) {
        return Array.from(new Set(error.map(userMessage))).join('\n');
    }
    if (error instanceof ApiError) {
        return error.userMessage() ?? NoServerMessage;
    }
    if (error instanceof Error) {
        return error.message || 'Something went wrong.';
    }
    return error || 'Something went wrong.';
}

// browserStack returns the stack trace of errors thrown in the browser, or null when there are none.
function browserStack(error: ErrorDivMsg): string | null {
    const errors = Array.isArray(error) ? error : [error];
    const stacks: string[] = [];
    for (const e of errors) {
        if (e instanceof Error && !(e instanceof ApiError) && e.stack) {
            stacks.push(e.stack);
        }
    }
    return stacks.length > 0 ? stacks.join('\n\n') : null;
}

// ErrorDiv shows errorMsg as an alert, or nothing when it is null. Server errors show the
// server's message only; an error thrown in the browser (a bug) also offers its stack trace,
// which helps a bug report.
export function ErrorDiv({errorMsg, className}: ErrorDivProps) {
    if (!errorMsg) {
        return null;
    }

    const message = userMessage(errorMsg);
    const stack = browserStack(errorMsg);

    return (
        <div role="alert" className={`flex flex-col text-left text-c-error ${className ?? ''}`}>
            <strong>{message}</strong>
            {stack !== null && (
                <details>
                    <summary className="cursor-pointer">
                        <small>Technical details</small>
                    </summary>
                    <pre className="text-xs mt-1 whitespace-pre-wrap">{stack}</pre>
                </details>
            )}
        </div>
    );
}
