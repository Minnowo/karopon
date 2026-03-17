import {useRef, useState} from 'preact/hooks';

const ITEM_H = 48; // px per row
const VISIBLE = 3; // prev, current, next
const HALF = 1;

type BarrelPickerProps = {
    label: string;
    values: number[];
    selected: number;
    onChange: (v: number) => void;
    format: (v: number) => string;
    width?: string;
};

export const BarrelPicker = ({label, values, selected, onChange, format, width = 'w-16'}: BarrelPickerProps) => {
    const n = values.length;

    const selIdx = Math.max(0, values.indexOf(selected));

    // scrollPx: total visual offset in pixels. Positive = dragged down = showing earlier values.
    const [scrollPx, setScrollPx] = useState(0);
    const scrollRef = useRef(0); // mirrors scrollPx for use inside rAF callbacks
    const rafRef = useRef<number | null>(null);
    const animVel = useRef(0); // px/ms, used during momentum
    const ptr = useRef<{
        startY: number;
        startScroll: number;
        moved: boolean;
        lastY: number;
        lastT: number;
        vel: number; // exponential moving average velocity (px/ms)
    } | null>(null);

    // Decompose scroll into integer steps + fractional offset.
    const liveOffset = -scrollPx / ITEM_H;
    const base = Math.floor(liveOffset);
    const frac = liveOffset - base;
    const centerDelta = Math.round(frac);

    const snapTo = (scroll: number) => {
        const delta = -Math.round(scroll / ITEM_H);
        onChange(values[(((selIdx + delta) % n) + n) % n]);
        scrollRef.current = 0;
        setScrollPx(0);
    };

    const onPointerDown = (e: PointerEvent) => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        ptr.current = {
            startY: e.clientY,
            startScroll: scrollRef.current,
            moved: false,
            lastY: e.clientY,
            lastT: performance.now(),
            vel: 0,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
        if (!ptr.current) {
            return;
        }
        const dy = e.clientY - ptr.current.startY;
        if (Math.abs(dy) > 4) {
            ptr.current.moved = true;
        }
        const now = performance.now();
        const dt = now - ptr.current.lastT;
        if (dt > 0) {
            const raw = (e.clientY - ptr.current.lastY) / dt;
            ptr.current.vel = ptr.current.vel * 0.6 + raw * 0.4;
        }
        ptr.current.lastY = e.clientY;
        ptr.current.lastT = now;
        const next = ptr.current.startScroll + dy;
        scrollRef.current = next;
        setScrollPx(next);
        e.preventDefault();
    };

    const onPointerUp = (e: PointerEvent) => {
        if (!ptr.current) {
            return;
        }
        const p = ptr.current;
        ptr.current = null;

        if (!p.moved) {
            // Tap → jump to tapped row.
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const row = Math.floor((e.clientY - rect.top) / ITEM_H);
            const delta = row - HALF;
            if (delta !== 0) {
                onChange(values[(((selIdx + delta) % n) + n) % n]);
            }
            scrollRef.current = 0;
            setScrollPx(0);
            return;
        }

        if (Math.abs(p.vel) < 0.15) {
            snapTo(scrollRef.current);
            return;
        }

        // Momentum: continue with friction until velocity dies out, then snap.
        animVel.current = p.vel;
        const animate = (prevT: number) => {
            const now = performance.now();
            const dt = Math.min(now - prevT, 32);
            animVel.current *= Math.pow(0.96, dt / 16);
            scrollRef.current += animVel.current * dt;
            setScrollPx(scrollRef.current);
            if (Math.abs(animVel.current) < 0.03) {
                rafRef.current = null;
                snapTo(scrollRef.current);
                return;
            }
            rafRef.current = requestAnimationFrame(() => animate(now));
        };
        rafRef.current = requestAnimationFrame(() => animate(performance.now()));
    };

    const onPointerCancel = () => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        scrollRef.current = 0;
        setScrollPx(0);
        ptr.current = null;
    };

    return (
        <div className="flex flex-col">
            <span className="w-full text-center">{label}</span>
            <div
                className={`relative overflow-hidden select-none ${width} cursor-grab`}
                style={{height: VISIBLE * ITEM_H, touchAction: 'none'}}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
            >
                {[-1, 0, 1, 2].map((delta) => {
                    const k = base + delta;
                    const idx = (((selIdx + k) % n) + n) % n;
                    const top = HALF * ITEM_H + (delta - frac) * ITEM_H;
                    const isCenter = delta === centerDelta;
                    const opacity = isCenter ? 1 : 0.5;
                    return (
                        <div
                            key={delta}
                            className={`absolute inset-x-0 flex items-center justify-center text-xl ${isCenter ? 'font-bold' : ''}`}
                            style={{top, height: ITEM_H, opacity}}
                        >
                            {format(values[idx])}
                        </div>
                    );
                })}
            </div>
            <span className="w-full text-center">&nbsp;</span>
        </div>
    );
};
