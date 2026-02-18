import {useState, useRef, useEffect} from 'preact/hooks';

export type DropdownButtonAction = {
    label: string;
    dangerous?: boolean;
    onClick: () => void;
};

type DropdownProps = {
    actions: DropdownButtonAction[];
    label?: string;
    className?: string;
    buttonClassName?: string;
};

export function DropdownButton({
    actions,
    label = '[:]',
    className,
    buttonClassName = 'w-8 h-8 p-0 m-0 border-none bg-transparent hover:bg-c-surface0',
}: DropdownProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className !== undefined ? className : ''}`} ref={menuRef}>
            <button onClick={() => setOpen(!open)} className={buttonClassName}>
                {label === '[:]' ? (
                    <svg className="w-full h-full p-0 m-0 border-none" viewBox="0 0 32 32" fill="currentColor">
                        <circle cx="16" cy="8" r="2.5" />
                        <circle cx="16" cy="16" r="2.5" />
                        <circle cx="16" cy="24" r="2.5" />
                    </svg>
                ) : (
                    label
                )}
            </button>

            {open && (
                <div className="absolute border border-c-pink right-0 shadow-lg z-10 font-bold text-lg">
                    {actions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                action.onClick();
                                setOpen(false);
                            }}
                            className={`${action.dangerous ? 'text-c-red' : ''} w-full text-left whitespace-nowrap rounded-none border-none bg-c-surface0 hover:bg-c-surface2 px-2 py-1`}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
