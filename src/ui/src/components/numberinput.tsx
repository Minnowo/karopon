type Props = {
    class?: string;
    label: string;
    value: number;
    onChange: (value: number) => void;
    step?: number | string;
    inputMin?: number;
    inputMax?: number;
    min?: number;
};

export function NumberInput(p: Props) {
    const step: string | number = p.step || 'any';

    const handleInput = (e: InputEvent) => {
        const val = (e.target as HTMLInputElement).value;

        const parsed = parseFloat(val);
        if (!isNaN(parsed)) {
            if (p.min !== undefined && parsed === p.inputMin) {
                p.onChange(p.min);
            } else {
                p.onChange(parsed);
            }
        }
    };

    return (
        <div class={`relative min-w-32 ${p.class}`}>
            <span class="absolute no-drag top-1/2 -translate-y-1/2 left-1">{p.label}</span>
            <input
                class="w-full !pl-16"
                type="number"
                min={p.inputMin}
                max={p.inputMax}
                step={step}
                value={p.value}
                onInput={handleInput}
            />
        </div>
    );
}
