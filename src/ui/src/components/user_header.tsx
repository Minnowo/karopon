import {useState} from 'preact/hooks';
import {HeaderState} from '../state/header_state';

type UserHeaderProps = {
    state: HeaderState;
};

export function UserHeader({state}: UserHeaderProps) {
    const [showDropDown, setShowDropDown] = useState<boolean>(false);

    return (
        <main
            className="relative"
            tabIndex={0}
            onBlur={(e) => {
                const next = e.relatedTarget as Node | null;
                if (!e.currentTarget.contains(next)) {
                    setShowDropDown(false);
                }
            }}
        >
            <a onClick={() => setShowDropDown(true)}>
                {state.user.name}
            </a>
            {showDropDown && (
                <div className="flex flex-col absolute left-0 -ml-1">
                    <div>
                        [
                        <a href="#/settings" onClick={() => setShowDropDown(false)}>
                            Settings
                        </a>
                        ]
                    </div>
                    <div>
                        [
                        <a href="#/logout" onClick={() => setShowDropDown(false)}>
                            logout
                        </a>
                        ]
                    </div>
                </div>
            )}
        </main>
    );
}
