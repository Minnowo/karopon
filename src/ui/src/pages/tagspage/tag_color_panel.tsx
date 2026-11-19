import {useState} from 'preact/hooks';
import {EditorDialog} from '../../components/editor_dialog';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
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
                <span
                    className="w-6 h-6 rounded border border-c-outline-variant flex-shrink-0"
                    style={{backgroundColor: previewColor}}
                />
                <span className="text-sm font-mono break-all">{namespace}</span>
            </div>
            <div className="flex flex-col min-w-40 gap-1">
                <input
                    type="text"
                    className={`flex-1 w-64 px-2 py-1 text-sm font-mono ${invalid ? 'border-c-error' : ''}`}
                    placeholder="#rrggbb or --name"
                    aria-label={`Color for ${namespace}`}
                    value={value}
                    onInput={(e) => onChange(e.currentTarget.value)}
                />
                {invalid && <span className="text-xs text-c-error">Must be #rgb, #rrggbb, or var(--name)</span>}
            </div>
        </div>
    );
};

type TagColorPanelProps = {
    namespaces: string[];
    tagColors: TblUserTagColor[];
    onCancel: () => void;
    // Saves the colors; rejects with the API error so the dialog can show it.
    onUpdate: (c: Record<string, string>) => Promise<void>;
};

export const TagColorPanel = ({namespaces, tagColors, onUpdate, onCancel}: TagColorPanelProps) => {
    const [colorInputs, setColorInputs] = useState<Record<string, string>>(() =>
        Object.fromEntries(namespaces.map((ns) => [ns, tagColors.find((c) => c.namespace === ns)?.color ?? '']))
    );

    const hasInvalid = namespaces.some((ns) => {
        const t = (colorInputs[ns] ?? '').trim();
        return t !== '' && !isValidColor(t);
    });

    const [saving, setSaving] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);

    const handleSave = () => {
        // An invalid color already says so on its row.
        if (saving || hasInvalid) {
            return;
        }
        setSaving(true);
        setErrorMsg(null);
        onUpdate(colorInputs)
            .catch((e: unknown) => setErrorMsg(e instanceof Error ? e : String(e)))
            .finally(() => setSaving(false));
    };

    return (
        <EditorDialog title="Tag Colors" saveLabel="Save" saving={saving} onSave={handleSave} onClose={onCancel}>
            <details className="w-full">
                <summary className="cursor-pointer">How tag colors work</summary>

                <div className="flex flex-col gap-2 pt-2">
                    <p>
                        Assign a color to each namespace. Accepts hex (<code>#rgb</code>, <code>#rrggbb</code>) or CSS variables
                        name (<code>--xyz</code>). Leave empty to remove a color.
                    </p>

                    <p>Below are the variable name available, the colors change with the color theme.</p>

                    <ul class="space-y-2">
                        <li class="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-pink);" />
                            <span>--color-c-pink</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-l-pink);" />
                            <span>--color-c-l-pink</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-d-pink);" />
                            <span>--color-c-d-pink</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-red);" />
                            <span>--color-c-red</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-l-red);" />
                            <span>--color-c-l-red</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-d-red);" />
                            <span>--color-c-d-red</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-yellow);" />
                            <span>--color-c-yellow</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-l-yellow);" />
                            <span>--color-c-l-yellow</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-d-yellow);" />
                            <span>--color-c-d-yellow</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-green);" />
                            <span>--color-c-green</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-l-green);" />
                            <span>--color-c-l-green</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-d-green);" />
                            <span>--color-c-d-green</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-blue);" />
                            <span>--color-c-blue</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-l-blue);" />
                            <span>--color-c-l-blue</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded" style="background: var(--color-c-d-blue);" />
                            <span>--color-c-d-blue</span>
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
            <ErrorDiv errorMsg={errorMsg} />
        </EditorDialog>
    );
};
