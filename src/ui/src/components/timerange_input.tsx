import {useEffect, useState} from 'preact/hooks';
import {RelTimeRe} from '../utils/timerange';
import {NumberInput} from './number_input';

type Props = {
    range: string;
    onChange: (range: string) => void;
};

enum RangeType {
    HOUR = 'HOUR',
    DAY = 'DAY',
    WEEK = 'WEEK',
    MONTH = 'MONTH',
    YEAR = 'YEAR',
}

export const TimeRangeInput = ({range, onChange}: Props) => {
    const [startRangeType, setStartRangeType] = useState(RangeType.DAY);
    const [startAddAmt, setStartAddAmt] = useState(0);

    useEffect(() => {
        if (!range) {
            return;
        }
        const match = RelTimeRe.exec(range.toLowerCase());

        if (!match) {
            console.debug(range, " doesn't match");
            return;
        }

        const n = parseInt(match[2], 10);
        setStartAddAmt(match[1] === '-' ? -n : n);

        switch (match[3]) {
            case 'h': {
                setStartRangeType(RangeType.HOUR);
                break;
            }
            case 'd': {
                setStartRangeType(RangeType.DAY);
                break;
            }
            case 'w': {
                setStartRangeType(RangeType.WEEK);
                break;
            }
            case 'm': {
                setStartRangeType(RangeType.MONTH);
                break;
            }
            case 'y': {
                setStartRangeType(RangeType.YEAR);
                break;
            }
            default:
                break;
        }
    }, [range]);

    const update = (n: number, t: string) => {
        const ts = `now${n >= 0 ? '+' : ''}${n}${t[0].toLowerCase()}`;
        onChange(ts);
    };

    const onNumberChange = (n: number) => {
        setStartAddAmt(n);
        update(n, startRangeType);
    };

    const onSelectChange = (t: string) => {
        setStartRangeType(t as RangeType);
        update(startAddAmt, t);
    };

    return (
        <div className="flex flex-row input-like w-fit">
            <NumberInput
                label={`Now +`}
                value={startAddAmt}
                onValueChange={onNumberChange}
                min={-10000}
                max={10000}
                className="border-none"
                innerClassName={`w-[7ch] text-right p-0 pl-0! mx-1`}
            />
            <select
                className="mx-2 border-none"
                value={startRangeType}
                onInput={(e) => onSelectChange((e.target as HTMLSelectElement).value)}
            >
                {[RangeType.HOUR, RangeType.DAY, RangeType.WEEK, RangeType.MONTH, RangeType.YEAR].map((x) => (
                    <option key={x} value={x}>
                        {x}
                    </option>
                ))}
            </select>
        </div>
    );
};
