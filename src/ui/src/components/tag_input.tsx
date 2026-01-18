
import { useRef, useState } from "preact/hooks";

type TagInputProps = {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
};

export function TagInput({
    value,
    onChange,
    placeholder = "Add tag",
    disabled = false,
}: TagInputProps) {
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const normalized = (tag: string) => tag.trim();

    const addTag = (raw: string) => {
        const tag = normalized(raw);
        if (!tag) {return;}

        const exists = value.some(
            t => t.toLowerCase() === tag.toLowerCase()
        );
        if (exists) {return;}

        onChange([...value, tag]);
        setInput("");
    };

    const removeTag = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (disabled) {return;}

        if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
            e.preventDefault();
            addTag(input);
        }

        if (e.key === "Backspace" && input === "" && value.length > 0) {
            const t = value[value.length - 1];
            removeTag(value.length - 1);
                setInput(t);
        }
    };

    const onBlur = () => {
        addTag(input);
    };

    return (
        <div
            className="w-full flex flex-wrap items-center gap-1 px-2 py-1 text-sm"
            onClick={() => inputRef.current?.focus()}
        >
            {value.map((tag, i) => (
                <span
                    key={tag}
                    className="flex items-center min-h-8 bg-c-magenta text-c-black rounded-2xl"
                >
                    <span className="pl-3 mr-2 break-words">{tag}</span>
                    <button
                        className="px-2 mr-1  font-bold  bg-transparent border-none rounded-2xl text-inherit"
                        type="button"
                        onClick={() => removeTag(i)}
                    >
                        ×
                    </button>
                </span>
            ))}

            <input
                ref={inputRef}
                className="flex-1 w-full min-w-[6ch] outline-none py-0.5"
                value={input}
                disabled={disabled}
                placeholder={placeholder}
                onInput={(e) =>
                    setInput((e.target as HTMLInputElement).value)
                }
                onKeyDown={onKeyDown}
                onBlur={onBlur}
            />
        </div>
    );
}
