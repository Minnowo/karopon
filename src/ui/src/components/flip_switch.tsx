type Props = {
    value: boolean;
    onValueChanged: (value: boolean) => void;
    disabled?: boolean;
};

export const FlipSwitch = (p: Props) => {
    return (
        <div aria-disabled={p.disabled} className="relative">
            <input
                aria-disabled={p.disabled}
                disabled={p.disabled}
                type="checkbox"
                checked={p.value}
                onInput={(e) => p.onValueChanged((e.target as HTMLInputElement).checked)}
                className="peer sr-only"
            />

            <div
                aria-disabled={p.disabled}
                className="input-like w-11 h-6 border border-c-surface2 bg-c-surface0 aria-disabled:bg-c-surface1 rounded-full peer-checked:bg-c-green aria-disabled:cursor-not-allowed aria-disabled:peer-checked:bg-c-green/60 transition-colors duration-200"
            />

            <div
                aria-disabled={p.disabled}
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow bg-c-text aria-disabled:cursor-not-allowed aria-disabled:bg-c-subtext0 transition-all duration-200 peer-checked:translate-x-5"
            />
        </div>
    );
};
