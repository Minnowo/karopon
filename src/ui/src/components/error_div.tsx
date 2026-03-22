import {ApiError} from '../api/api';

export type ErrorDivMsg = Error[] | Error | string;

type ErrorDivProps = {
    errorMsg: ErrorDivMsg | null;
    className?: string;
};

function getUserFriendlyMessage(error: ErrorDivMsg): string {
    if (Array.isArray(error)) {
        const messages = error.map(getUserFriendlyMessage);
        const uniqueMessages = Array.from(new Set(messages));
        return uniqueMessages.join('\n');
    }

    if (error instanceof ApiError) {
        switch (error.status) {
            case 400:
                return 'The request(s) contains invalid or malformed data.';
            case 401:
                return 'Authentication is required to access this resource.';
            case 403:
                return 'The requested action(s) is not permitted with current permissions.';
            case 404:
                return 'The requested item(s) could not be found.';
            case 409:
                return 'There is a conflict with existing data preventing this action(s).';
            case 422:
                return 'Some field(s) in the request contain invalid or incomplete information.';
            case 429:
                return 'Request(s) are being sent too frequently and are being throttled.';
            case 500:
                return 'An internal server error occurred while processing the request(s).';
            case 503:
                return 'The service is temporarily unavailable due to maintenance or overload.';
            default:
                return 'An unexpected error occurred during the request(s).';
        }
    }

    if (error instanceof Error) {
        return error.message || 'Something went wrong.';
    }

    return error || 'Something went wrong.';
}

function getDeveloperMessage(error: ErrorDivMsg): string | null {
    if (Array.isArray(error)) {
        return error.map(getDeveloperMessage).filter(Boolean).join('\n');
    }

    if (error instanceof ApiError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.stack || error.message || 'Unknown error';
    }

    return null;
}

export function ErrorDiv({errorMsg, className}: ErrorDivProps) {
    if (!errorMsg) {
        return null;
    }

    const userMessage = getUserFriendlyMessage(errorMsg);
    const devMessage = getDeveloperMessage(errorMsg);

    return (
        <div className={`flex flex-col text-left text-c-red ${className ?? ''}`}>
            <h2 className="font-semibold text-sm">{userMessage}</h2>
            {devMessage && <pre className="text-xs text-c-overlay2 mt-1 whitespace-pre-wrap">{devMessage}</pre>}
        </div>
    );
}
