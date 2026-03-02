import {useEffect, useState} from 'preact/hooks';
import {BaseState} from '../state/basestate';
import {UserSession} from '../api/types';
import {ApiDeleteUserSession, ApiGetUserSessions} from '../api/api';
import {ErrorDiv} from '../components/error_div';
import {FormatSmartTimestamp} from '../utils/date_utils';

function SessionRow({session, onDelete}: {session: UserSession; onDelete: (session: UserSession) => void}) {
    const label = session.user_agent || 'Unknown device';

    return (
        <div
            className={`rounded-sm p-2 border container-theme flex flex-col gap-1 ${session.is_current ? 'border-c-l-green' : ''}`}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="break-all text-sm font-semibold">{label}</span>
                {session.is_current && <span className="text-c-l-green font-bold text-xs whitespace-nowrap">current</span>}
            </div>
            <div className="flex flex-wrap justify-between items-end gap-2 text-xs">
                <div>
                    <div>Created: {FormatSmartTimestamp(session.created)}</div>
                    <div>Expires: {FormatSmartTimestamp(session.expires)}</div>
                </div>
                <button className="bg-c-red font-bold text-sm px-3 py-1" onClick={() => onDelete(session)}>
                    Revoke
                </button>
            </div>
        </div>
    );
}

export function SessionsPage(state: BaseState) {
    const [sessions, setSessions] = useState<UserSession[] | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        ApiGetUserSessions()
            .then(setSessions)
            .catch((e: Error) => setErrorMsg(e.message));
    }, []);

    function handleDelete(session: UserSession) {
        ApiDeleteUserSession(session)
            .then(() => setSessions((prev) => prev?.filter((s) => s.token_id !== session.token_id) ?? null))
            .catch((e: Error) => setErrorMsg(e.message));
    }

    return (
        <main className="flex flex-col items-center justify-center space-y-4">
            <div className="w-full space-y-4">
                <h2 className="font-bold text-lg my-4">Active Sessions</h2>

                <ErrorDiv errorMsg={errorMsg} />

                {sessions === null ? (
                    <div>Loading...</div>
                ) : sessions.length === 0 ? (
                    <div>No active sessions.</div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {sessions.map((s) => (
                            <SessionRow key={s.token_id} session={s} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
