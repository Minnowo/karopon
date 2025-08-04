import {useState, useRef, useEffect} from 'preact/hooks';

type Action = {
    label: string;
    onClick: () => void;
};

type DropdownProps = {
    actions: Action[];
    label?: string;
};

export function DropdownButton({actions, label = '[:]'}: DropdownProps) {
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
        <div class="relative" ref={menuRef}>
            <button onClick={() => setOpen(!open)} class="font-mono p-0.5 m-0 border-none bg-c-d-black hover:bg-c-black">
                {label}
            </button>

            {open && (
                <div class="absolute container-theme right-0 shadow-lg z-10">
                    {actions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                action.onClick();
                                setOpen(false);
                            }}
                            class="w-full text-left rounded-none border-none hover:bg-c-black px-2 py-1"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
