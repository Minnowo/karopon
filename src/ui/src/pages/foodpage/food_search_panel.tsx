import {useState} from 'preact/hooks';
import {TblDataSource, TblDataSourceFood} from '../../api/types';
import {ApiGetDataSourceFoods} from '../../api/api';
import {GetErrorHandler} from '../../utils/error';
import {ErrorDiv} from '../../components/error_div';
import {Fragment} from 'preact/jsx-runtime';

type FoodSearchPanelProps = {
    readonly doRefresh: () => void;
    onChooseFood: (food: TblDataSourceFood) => void;
    dataSources: TblDataSource[];
};
export const FoodSearchPanel = (state: FoodSearchPanelProps) => {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [curRow, setCurRow] = useState<number>(-1);
    const [selectedDataSource, setSelectedDataSource] = useState<number | null>(
        state.dataSources.length > 0 ? state.dataSources[0].id : null
    );
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<TblDataSourceFood[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!selectedDataSource || !searchText.trim()) {
            return;
        }
        setLoading(true);
        try {
            const foods = await ApiGetDataSourceFoods(selectedDataSource, searchText.trim());
            setResults(foods);
        } catch (err) {
            GetErrorHandler(setErrorMsg, state.doRefresh)(err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="flex flex-col">
            <ErrorDiv errorMsg={errorMsg} />

            <select
                className="border rounded mb-2"
                value={selectedDataSource ?? ''}
                onChange={(e) => setSelectedDataSource(Number(e.currentTarget.value))}
            >
                <option value="" disabled>
                    Select a datasource
                </option>
                {state.dataSources.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                        {ds.name}
                    </option>
                ))}
            </select>

            <div className="flex flex-row items-center mb-2">
                <input
                    type="text"
                    value={searchText}
                    onInput={(e: Event) => setSearchText((e.target as HTMLInputElement).value)}
                    onKeyPress={handleKeyPress}
                    className="w-full mr-1"
                    placeholder="Type food name..."
                />

                <button
                    type="button"
                    onClick={handleSearch}
                    className="ml-1 max-w-32 w-full"
                    disabled={!selectedDataSource || !searchText.trim() || loading}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {results.length > 0 ? (
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-xs font-semibold">
                            <th className=" text-left py-1" title="Food Name">
                                {' '}
                                Name{' '}
                            </th>
                            <th className=" text-right py-1 pr-2" title="Amount">
                                Amt
                            </th>
                            <th className=" text-right py-1 pr-2" title="Fat">
                                Fat
                            </th>
                            <th className=" text-right py-1 pr-2" title="Carbs">
                                Carb
                            </th>
                            <th className=" text-right py-1 pr-2" title="Fibre">
                                Fib
                            </th>
                            <th className=" text-right py-1 pr-2" title="Protein">
                                Prot
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {results.map((food: TblDataSourceFood, i: number) => {
                            const shown = i === curRow;
                            const toggle = () => setCurRow(shown ? -1 : i);
                            const rowColor = i % 2 === 0 ? 'bg-c-surface0' : 'bg-c-surface1';

                            return (
                                <Fragment key={food.id}>
                                    {shown && (
                                        <tr className={`cursor-pointer ${rowColor}`} onClick={toggle}>
                                            <td className="border-c-accent2 border-t-2 " colSpan={7}>
                                                <div className="mx-1">{food.name}</div>
                                            </td>
                                        </tr>
                                    )}
                                    <tr onClick={toggle} className={`cursor-pointer ${rowColor}`}>
                                        <td className={`wsnw max-w-[100px] sm:w-full pr-2`}>
                                            {!shown ? (
                                                <div className="overflow-x-hidden">{food.name}</div>
                                            ) : (
                                                <div className="w-full">&nbsp;</div>
                                            )}
                                        </td>
                                        <td className="text-right wsnw pr-2">
                                            {food.portion} {food.unit}
                                        </td>
                                        <td className="text-right pr-2">{food.fat.toFixed(1)}</td>
                                        <td className="text-right pr-2">{food.carb.toFixed(1)}</td>
                                        <td className="text-right pr-2">{food.fibre.toFixed(1)}</td>
                                        <td className="text-right pr-2">{food.protein.toFixed(1)}</td>
                                    </tr>
                                    {shown && (
                                        <tr className={`${rowColor}`}>
                                            <td colSpan={7}>
                                                <div className="flex flex-row py-2 justify-between px-1">
                                                    <div className="flex flex-col">
                                                        <span>ID {food.data_source_row_int_id}</span>
                                                    </div>
                                                    <button
                                                        className="bg-c-green max-w-32 w-full"
                                                        onClick={() => state.onChooseFood(food)}
                                                    >
                                                        Choose
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <p className="text-c-magenta mt-2">No results found.</p>
            )}
        </div>
    );
};
