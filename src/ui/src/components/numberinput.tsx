type Props = {
    class?: string;
    label: string;
    value: number;
    onChange: (value: number) => void;
    step?: number | string;
    min?: number;
    max?: number;
};

export function NumberInput(p: Props) {
    const step: string | number = p.step || "any";

    return (
        <div class={`relative min-w-32 ${p.class}`}>
            <span class="absolute no-drag top-1/2 -translate-y-1/2 left-1">
                {p.label}
            </span>
            <input
                class="w-full !pl-16"
                type="number"
                min={p.min}
                max={p.max}
                step={step}
                value={p.value}
                onInput={(e) =>
                    p.onChange(
                        parseFloat((e.target as HTMLInputElement).value) || 0,
                    )
                }
            />
        </div>
    );
}
