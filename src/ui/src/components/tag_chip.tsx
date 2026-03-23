import {useLayoutEffect, useRef, useState} from 'preact/hooks';
import {TblUserTag} from '../api/types';

type Props = {
    tag: TblUserTag;
    onRemove?: () => void;
    color?: string;
};

const luminance = (r: number, g: number, b: number): number => {
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
};

const hexContrastColor = (hex: string): string => {
    let h = hex.slice(1);
    if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    return luminance(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)) > 0.179
        ? '#000000'
        : '#ffffff';
};

export const TagChip = ({tag, color, onRemove = undefined}: Props) => {
    const showDeleteButton = onRemove !== undefined;
    const spanRef = useRef<HTMLSpanElement>(null);
    const [cssVarTextColor, setCssVarTextColor] = useState<string | undefined>(undefined);

    const isHex = color?.startsWith('#') ?? false;

    useLayoutEffect(() => {
        if (!color) {
            return;
        }
        if (isHex) {
            setCssVarTextColor(hexContrastColor(color));
            return;
        }
        if (!spanRef.current) {
            return;
        }
        const bg = getComputedStyle(spanRef.current).backgroundColor;
        const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match || (match[4] !== undefined && parseFloat(match[4]) === 0)) {
            setCssVarTextColor(undefined);
            return;
        }
        const L = luminance(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10));
        setCssVarTextColor(L > 0.179 ? '#000000' : '#ffffff');
    }, [color, isHex]);

    const style = color ? {backgroundColor: color, ...(cssVarTextColor ? {color: cssVarTextColor} : {})} : undefined;

    return (
        <span ref={spanRef} className="flex items-center min-h-8 rounded-2xl w-fit" style={style}>
            <span className={`pl-3 ${showDeleteButton ? 'mr-2' : 'pr-3'} break-words`}>
                {tag.namespace}:{tag.name}
            </span>
            {showDeleteButton && (
                <button
                    className="px-2 mr-1 font-bold bg-transparent border-none rounded-2xl text-inherit focus:bg-c-surface2 hover:bg-c-surface2"
                    type="button"
                    onClick={() => onRemove()}
                >
                    ×
                </button>
            )}
        </span>
    );
};
