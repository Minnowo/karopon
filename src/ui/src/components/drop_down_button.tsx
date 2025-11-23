import {useState, useRef, useEffect} from 'preact/hooks';

export type DropdownButtonAction = {
    label: string;
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
    buttonClassName = 'w-full h-full font-mono p-0.5 m-0 border-none bg-c-d-black hover:bg-c-black',
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
        <div className={`relative ${className}`} ref={menuRef}>
            <button onClick={() => setOpen(!open)} className={buttonClassName}>
                {label}
            </button>

            {open && (
                <div className="absolute container-theme right-0 shadow-lg z-10">
                    {actions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                action.onClick();
                                setOpen(false);
                            }}
                            className="w-full text-left rounded-none border-none hover:bg-c-black px-2 py-1"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
