import {useState, useRef, useEffect} from 'preact/hooks';
import {ThreeVertDots} from './svg';

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
    buttonClassName = 'w-8 h-8 p-0 m-0 border-none bg-transparent hover:bg-c-surface-container-2',
}: DropdownProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

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
        <div
            className={`relative h-fit w-fit ${className !== undefined ? className : ''}`}
            ref={menuRef}
            onKeyDown={(e) => {
                if (e.key === 'Escape' && open) {
                    setOpen(false);
                    triggerRef.current?.focus();
                }
            }}
        >
            <div className="flex items-center">
                <button
                    ref={triggerRef}
                    onClick={() => setOpen(!open)}
                    className={`std-focus ${buttonClassName}`}
                    aria-label={label === '[:]' ? 'More actions' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open}
                >
                    {label === '[:]' ? ThreeVertDots : label}
                </button>
            </div>

            {open && (
                <div className="absolute border border-c-primary right-0 shadow-lg z-10 mt-1 font-bold text-lg">
                    {actions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                action.onClick();
                                setOpen(false);
                            }}
                            className={`${action.dangerous ? 'text-c-error' : ''} w-full text-left wsnw rounded-none border-none bg-c-surface-container-2 focus:bg-c-surface-container-4 hover:bg-c-surface-container-4 px-2 py-1`}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
