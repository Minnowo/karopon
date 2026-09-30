import {useEffect, useState} from 'preact/hooks';
import {BaseState} from '../state/basestate';
import {UserSession} from '../api/types';
import {ApiDeleteUserSession, ApiGetUserSessions, ApiUpdateUserSession} from '../api/api';
import {ErrorDiv} from '../components/error_div';
import {FormatSmartTimestamp} from '../utils/date_utils';
import {DropdownButton} from '../components/drop_down_button';

function SessionRow({
    session,
    onDelete,
    onUpdate,
}: {
    session: UserSession;
    onDelete: (session: UserSession) => void;
    onUpdate: (session: UserSession, name: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');

    const label = session.user_agent || 'Unknown device';

    const startEdit = () => {
        setEditName(session.user_agent || '');
        setEditing(true);
    };

    const cancelEdit = () => {
        setEditing(false);
    };

    const saveEdit = () => {
        if (!editName.trim()) {
            return;
        }
        onUpdate(session, editName.trim());
        setEditing(false);
    };

    return (
        <div className={`surface-1 flex flex-col gap-2 ${session.is_current ? 'surface-border border-c-success' : ''}`}>
            <div className="flex items-start justify-between gap-2">
                <h4 className="break-all">{label}</h4>
                {session.is_current && <small className="text-c-success wsnw">current</small>}
            </div>

            {editing ? (
                <div className="flex flex-col gap-2">
                    <input
                        className="w-full"
                        value={editName}
                        aria-label="Session name"
                        onInput={(e) => setEditName((e.target as HTMLInputElement).value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                saveEdit();
                            }
                            if (e.key === 'Escape') {
                                cancelEdit();
                            }
                        }}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={cancelEdit}>Cancel</button>
                        <button className="btn-success" onClick={saveEdit}>
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap justify-between items-end gap-2">
                    <div className="flex flex-col">
                        <small>Created: {FormatSmartTimestamp(session.created)}</small>
                        <small>Expires: {FormatSmartTimestamp(session.expires)}</small>
                    </div>
                    <DropdownButton
                        actions={[
                            {label: 'Rename', onClick: startEdit},
                            {
                                label: 'Revoke',
                                dangerous: true,
                                onClick: () => {
                                    if (confirm('Revoke this session? The device will be signed out.')) {
                                        onDelete(session);
                                    }
                                },
                            },
                        ]}
                    />
                </div>
            )}
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

    const handleDelete = (session: UserSession) => {
        ApiDeleteUserSession(session)
            .then(() => setSessions((prev) => prev?.filter((s) => s.token_id !== session.token_id) ?? null))
            .catch((e: Error) => setErrorMsg(e.message));
    };

    const handleUpdate = (session: UserSession, name: string) => {
        ApiUpdateUserSession(session, name)
            .then(() =>
                setSessions((prev) => prev?.map((s) => (s.token_id === session.token_id ? {...s, user_agent: name} : s)) ?? null)
            )
            .catch((e: Error) => setErrorMsg(e.message));
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-full flex flex-col gap-4">
                <h1>Active Sessions</h1>

                <ErrorDiv errorMsg={errorMsg} />

                {sessions === null ? (
                    <div>There are no sessions, reload the page.</div>
                ) : sessions.length === 0 ? (
                    <div>No active sessions.</div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {sessions.map((s) => (
                            <SessionRow key={s.token_id} session={s} onDelete={handleDelete} onUpdate={handleUpdate} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
