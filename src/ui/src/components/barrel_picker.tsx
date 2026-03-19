import {useRef, useState} from 'preact/hooks';

const ITEM_HEIGHT_PX = 32;
const VISIBLE = 3; // prev, current, next
const HALF = 1;

// Drag & velocity
const DRAG_THRESHOLD_PX = 4; // min movement before a drag is registered
const VEL_EMA_PREV = 0.6; // EMA weight for previous velocity sample
const VEL_EMA_NEW = 0.4; // EMA weight for incoming velocity sample
const STATIONARY_MS = 80; // if pointer hasn't moved for this long, treat release velocity as zero

// Momentum animation
const MAX_FRAME_MS = 32; // dt cap to avoid jumps after tab switches
const MOMENTUM_MIN_VEL = 0.15; // px/ms — below this, skip momentum and snap directly
const MOMENTUM_STOP_VEL = 0.03; // px/ms — friction has decayed enough to snap
const MOMENTUM_FRICTION = 0.94; // velocity multiplier per 16ms

// Snap-to animation
const SNAP_DECAY = 0.75; // remaining-distance multiplier per 16ms
const SNAP_ARRIVE_PX = 0.5; // px — close enough to the target to commit

type BarrelPickerBase = {
    label: string;
    selected: number;
    onChange: (v: number) => void;
    format: (v: number) => string;
    width?: string;
    allowWrap?: boolean;
};

type BarrelPickerWithValues = BarrelPickerBase & {
    values: number[];
    min?: never;
    max?: never;
};

type BarrelPickerWithRange = BarrelPickerBase & {
    values?: never;
    min: number;
    max: number;
};

type BarrelPickerProps = BarrelPickerWithValues | BarrelPickerWithRange;

export const BarrelPicker = ({
    label,
    values,
    min,
    max,
    selected,
    onChange,
    format,
    width = 'w-16',
    allowWrap = true,
}: BarrelPickerProps) => {
    const n = values ? values.length : max - min + 1;
    const selIdx = values ? Math.max(0, values.indexOf(selected)) : selected - min;

    const valueAt = (delta: number): number => {
        if (allowWrap) {
            const idx = (((selIdx + delta) % n) + n) % n;
            return values ? values[idx] : min! + idx;
        }
        const idx = Math.max(0, Math.min(n - 1, selIdx + delta));
        return values ? values[idx] : min! + idx;
    };

    const inRange = (delta: number): boolean => {
        if (allowWrap) {
            return true;
        }
        const idx = selIdx + delta;
        return idx >= 0 && idx < n;
    };

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
    const liveOffset = -scrollPx / ITEM_HEIGHT_PX;
    const base = Math.floor(liveOffset);
    const frac = liveOffset - base;
    const centerDelta = Math.round(frac);

    // When not wrapping, clamp scroll so it can't animate past the first/last item.
    const clampScroll = (scroll: number): number => {
        if (allowWrap) {
            return scroll;
        }
        const maxBack = selIdx * ITEM_HEIGHT_PX;
        const maxForward = (n - 1 - selIdx) * ITEM_HEIGHT_PX;
        return Math.max(-maxForward, Math.min(maxBack, scroll));
    };

    // Smoothly ease scrollPx to the nearest snap position, then commit.
    const snapToSmooth = () => {
        const target = Math.round(scrollRef.current / ITEM_HEIGHT_PX) * ITEM_HEIGHT_PX;

        const animateSnap = (prevT: number) => {
            const now = performance.now();
            const dt = Math.min(now - prevT, MAX_FRAME_MS);

            const remaining = target - scrollRef.current;
            scrollRef.current += remaining * (1 - Math.pow(SNAP_DECAY, dt / 16));

            if (Math.abs(target - scrollRef.current) < SNAP_ARRIVE_PX) {
                rafRef.current = null;
                const delta = -Math.round(target / ITEM_HEIGHT_PX);
                onChange(valueAt(delta));
                scrollRef.current = 0;
                setScrollPx(0);
                return;
            }

            setScrollPx(scrollRef.current);
            rafRef.current = requestAnimationFrame(() => animateSnap(now));
        };

        rafRef.current = requestAnimationFrame(() => animateSnap(performance.now()));
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
        if (Math.abs(dy) > DRAG_THRESHOLD_PX) {
            ptr.current.moved = true;
        }

        const now = performance.now();
        const dt = now - ptr.current.lastT;
        if (dt > 0) {
            const raw = (e.clientY - ptr.current.lastY) / dt;
            ptr.current.vel = ptr.current.vel * VEL_EMA_PREV + raw * VEL_EMA_NEW;
        }
        ptr.current.lastY = e.clientY;
        ptr.current.lastT = now;

        const next = clampScroll(ptr.current.startScroll + dy);
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
            // tapped only, no motion
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const row = Math.floor((e.clientY - rect.top) / ITEM_HEIGHT_PX);
            const delta = row - HALF;
            if (delta !== 0) {
                onChange(valueAt(delta));
            }
            scrollRef.current = 0;
            setScrollPx(0);
            return;
        }

        // If the pointer was stationary before release, ignore accumulated velocity.
        const vel = performance.now() - p.lastT > STATIONARY_MS ? 0 : p.vel;

        if (Math.abs(vel) < MOMENTUM_MIN_VEL) {
            snapToSmooth();
            return;
        }

        // Momentum: continue with friction until velocity dies out, then snap.
        animVel.current = vel;
        const animate = (prevT: number) => {
            const now = performance.now();
            const dt = Math.min(now - prevT, MAX_FRAME_MS);

            animVel.current *= Math.pow(MOMENTUM_FRICTION, dt / 16);
            const next = clampScroll(scrollRef.current + animVel.current * dt);
            const hitBoundary = next !== scrollRef.current + animVel.current * dt;
            scrollRef.current = next;
            setScrollPx(next);

            if (hitBoundary || Math.abs(animVel.current) < MOMENTUM_STOP_VEL) {
                rafRef.current = null;
                snapToSmooth();
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
                style={{height: VISIBLE * ITEM_HEIGHT_PX, touchAction: 'none'}}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
            >
                {[-1, 0, 1, 2].map((delta) => {
                    const k = base + delta;
                    const top = HALF * ITEM_HEIGHT_PX + (delta - frac) * ITEM_HEIGHT_PX;
                    const isCenter = delta === centerDelta;
                    const visible = inRange(k);
                    const opacity = !visible ? 0 : isCenter ? 1 : 0.5;
                    return (
                        <div
                            key={delta}
                            className={`absolute inset-x-0 flex items-center justify-center text-xl ${isCenter ? 'font-bold' : ''}`}
                            style={{top, height: ITEM_HEIGHT_PX, opacity}}
                        >
                            {visible ? format(valueAt(k)) : ''}
                        </div>
                    );
                })}
            </div>
            <span className="w-full select-none text-center">&nbsp;</span>
        </div>
    );
};
