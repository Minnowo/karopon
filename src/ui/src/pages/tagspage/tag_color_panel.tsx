import {useState} from 'preact/hooks';
import {TblUserTagColor} from '../../api/types';
import {FmtTagColor} from '../../utils/tags';

const reColorHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const reColorCSSVar = /^--[a-zA-Z][a-zA-Z0-9-]*$/;
const isValidColor = (v: string) => v.length > 0 && (reColorHex.test(v) || reColorCSSVar.test(v));

type TagColorRowProps = {
    namespace: string;
    currentColor: string | undefined;
    value: string;
    onChange: (v: string) => void;
};

const TagColorRow = ({namespace, currentColor, value, onChange}: TagColorRowProps) => {
    const trimmed = value.trim();
    const invalid = trimmed !== '' && !isValidColor(trimmed);
    const previewColor = !invalid ? FmtTagColor(trimmed) : (currentColor ?? 'transparent');

    return (
        <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded border flex-shrink-0" style={{backgroundColor: previewColor}} />
                <span className="text-sm font-mono break-all">{namespace}</span>
            </div>
            <div className="flex flex-col min-w-40 gap-1">
                <input
                    type="text"
                    className={`flex-1 w-64 px-2 py-1 text-sm font-mono ${invalid ? 'border-c-red' : ''}`}
                    placeholder="#rrggbb or --name"
                    value={value}
                    onInput={(e) => onChange(e.currentTarget.value)}
                />
                {invalid && <span className="text-xs text-c-red">Must be #rgb, #rrggbb, or var(--name)</span>}
            </div>
        </div>
    );
};

type TagColorPanelProps = {
    namespaces: string[];
    tagColors: TblUserTagColor[];
    onCancel: () => void;
    onUpdate: (c: Record<string, string>) => void;
};

export const TagColorPanel = ({namespaces, tagColors, onUpdate, onCancel}: TagColorPanelProps) => {
    const [colorInputs, setColorInputs] = useState<Record<string, string>>(() =>
        Object.fromEntries(namespaces.map((ns) => [ns, tagColors.find((c) => c.namespace === ns)?.color ?? '']))
    );

    const hasInvalid = namespaces.some((ns) => {
        const t = (colorInputs[ns] ?? '').trim();
        return t !== '' && !isValidColor(t);
    });

    const handleSave = () => {
        onUpdate(colorInputs);
    };

    return (
        <div className="mb-4 p-3 border rounded container-theme flex flex-col gap-2">
            <details className="w-full no-summary-arrow">
                <summary className="cursor-pointer">
                    <h2 className="text-lg font-bold inline">Tag Colors</h2>
                    <span className="text-xs"> (click for help)</span>
                </summary>

                <div className="text-sm p-4">
                    <p className="text-sm">
                        Assign a color to each namespace. Accepts hex (<code>#rgb</code>, <code>#rrggbb</code>) or CSS variables
                        name (<code>--xyz</code>). Leave empty to remove a color.
                    </p>

                    <br />

                    <p className="text-sm">Below are the variable name available, the colors change with the color theme.</p>

                    <br />

                    <ul class="space-y-2">
                        <li class="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-rosewater);" />
                            <span>--color-c-rosewater</span>
                        </li>
                        <li class="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-flamingo);" />
                            <span>--color-c-flamingo</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-pink);" />
                            <span>--color-c-pink</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-mauve);" />
                            <span>--color-c-mauve</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-red);" />
                            <span>--color-c-red</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-maroon);" />
                            <span>--color-c-maroon</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-peach);" />
                            <span>--color-c-peach</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-yellow);" />
                            <span>--color-c-yellow</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-green);" />
                            <span>--color-c-green</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-teal);" />
                            <span>--color-c-teal</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-sky);" />
                            <span>--color-c-sky</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-sapphire);" />
                            <span>--color-c-sapphire</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-blue);" />
                            <span>--color-c-blue</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-lavender);" />
                            <span>--color-c-lavender</span>
                        </li>
                    </ul>
                </div>
            </details>

            {namespaces.map((ns) => (
                <TagColorRow
                    key={ns}
                    namespace={ns}
                    currentColor={tagColors.find((c) => c.namespace === ns)?.color}
                    value={colorInputs[ns] ?? ''}
                    onChange={(v) => setColorInputs((prev) => ({...prev, [ns]: v}))}
                />
            ))}
            <div className="flex gap-2 justify-end">
                <button className="cancel-btn" onClick={onCancel}>
                    Cancel
                </button>
                <button className="save-btn" disabled={hasInvalid} onClick={handleSave}>
                    Save
                </button>
            </div>
        </div>
    );
};
