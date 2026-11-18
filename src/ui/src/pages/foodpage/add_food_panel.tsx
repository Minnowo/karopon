import {useState, useMemo, useRef, useEffect, useId} from 'preact/hooks';
import {TblDataSource, TblDataSourceFood, TblUserFood} from '../../api/types';
import {ApiError} from '../../api/api';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {FieldError} from '../../components/field_error';
import {DoRender} from '../../hooks/doRender';
import {NumberInput} from '../../components/number_input';
import {FoodSearchPanel} from './food_search_panel';

type AddFoodPanelProps = {
    food: TblUserFood;
    // Saves the food; rejects with an ApiError when the server refuses it.
    addFood: (food: TblUserFood) => Promise<void>;
    onCancel: () => void;
    dataSources: TblDataSource[] | null;
    className?: string;
    readonly doRefresh: () => void;
};
export function AddFoodPanel({food, dataSources, addFood, onCancel, className, doRefresh}: AddFoodPanelProps) {
    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(new Map());
    const [saving, setSaving] = useState<boolean>(false);
    const baseId = useId();
    const nameId = `${baseId}-name`;
    const unitId = `${baseId}-unit`;
    const portionId = `${baseId}-portion`;
    const fieldIds = new Map<string, string>([
        ['#/name', nameId],
        ['#/unit', unitId],
        ['#/portion', portionId],
    ]);

    const foodRef = useRef<HTMLInputElement>(null);
    const tmpFood = useMemo<TblUserFood>(() => ({...food}), [food]);
    const render = DoRender();

    useEffect(() => {
        foodRef.current?.focus();
    }, []);

    // A new starting food (e.g. Copy on another food) makes old errors meaningless.
    useEffect(() => {
        setErrorMsg(null);
        setFieldErrors(new Map());
    }, [food]);

    // clearFieldError drops the error of a field the user is editing, so it stops reading as invalid.
    const clearFieldError = (pointer: string) => {
        setFieldErrors((prev) => {
            if (!prev.has(pointer)) {
                return prev;
            }
            const next = new Map(prev);
            next.delete(pointer);
            return next;
        });
    };

    const onSaveClick = () => {
        // aria-disabled rather than disabled while saving, so the button keeps focus for keyboard users.
        if (saving) {
            return;
        }
        setErrorMsg(null);
        setFieldErrors(new Map());
        setSaving(true);

        addFood({...food, ...tmpFood})
            .catch((e: unknown) => {
                if (!(e instanceof ApiError)) {
                    setErrorMsg(e instanceof Error ? e : String(e));
                    return;
                }
                if (e.isUnauthorizedError()) {
                    doRefresh();
                }
                const errs = e.fieldErrors();
                setFieldErrors(errs);
                setErrorMsg(e);
                for (const [pointer, id] of fieldIds) {
                    if (errs.has(pointer)) {
                        document.getElementById(id)?.focus();
                        break;
                    }
                }
            })
            .finally(() => setSaving(false));
    };

    const onChooseFood = (chosenFood: TblDataSourceFood) => {
        tmpFood.name = chosenFood.name;
        tmpFood.unit = chosenFood.unit;
        tmpFood.portion = chosenFood.portion;
        tmpFood.fat = chosenFood.fat;
        tmpFood.carb = chosenFood.carb;
        tmpFood.fibre = chosenFood.fibre;
        tmpFood.protein = chosenFood.protein;
        foodRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
        render();
    };

    return (
        <div className={`surface-1 flex flex-col gap-4 ${className}`}>
            <div className="w-full">
                <details className="w-full no-summary-arrow">
                    <summary className="cursor-pointer">
                        <h2 className="inline">Create New Food</h2>
                        <small> (click for help)</small>
                    </summary>

                    <div className="flex flex-col gap-2 pt-2">
                        <p>Add a food using information from a nutrition label or a built-in data source.</p>

                        <h4>From a food label</h4>

                        <ol className="list-decimal list-inside space-y-1">
                            <li>Find the nutrition label on the package.</li>

                            <li>
                                Choose a unit and portion size that match the label.
                                <div className="ml-4 mt-1">
                                    You can choose any unit, as long as the portion of that unit represents the same portion as
                                    the label.
                                </div>
                                <div className="ml-4 mt-1">
                                    Example: <strong>1 bar (45 g)</strong>
                                </div>
                                <ol className="list-disc list-inside space-y-1 ml-4 mt-1">
                                    <li>
                                        Track in grams:
                                        <span className="ml-1">
                                            Unit <strong>g</strong>, Portion <strong>45</strong>
                                        </span>
                                    </li>
                                    <li>
                                        Track by kilograms:
                                        <span className="ml-1">
                                            Unit <strong>kg</strong>, Portion <strong>0.045</strong>
                                        </span>
                                    </li>
                                    <li>
                                        Track by item:
                                        <span className="ml-1">
                                            Unit <strong>bars</strong>, Portion <strong>1</strong>
                                        </span>
                                    </li>
                                </ol>
                            </li>

                            <li>Enter the nutrition values (Fat, Carbs, Fibre, Protein) as shown on the label.</li>

                            <li>Create the food.</li>
                        </ol>
                        <h4>From a built-in data source</h4>

                        <ol className="list-decimal list-inside space-y-1">
                            <li>
                                Expand the <strong>Search data sources for food</strong> section below.
                            </li>
                            <li>Select the data source you want to search.</li>
                            <li>Search for the food you want to add.</li>
                            <li>Review the search results and select the food you want.</li>
                            <li>
                                Click <strong>Choose</strong> to copy the food's information.
                            </li>
                            <li>Make any final adjustments to the food details.</li>
                            <li>Create the food.</li>
                        </ol>
                    </div>
                </details>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex flex-row flex-wrap gap-2">
                    <div className="flex flex-col flex-auto gap-1">
                        <input
                            ref={foodRef}
                            id={nameId}
                            type="text"
                            value={tmpFood.name}
                            onInput={(e) => {
                                tmpFood.name = e.currentTarget.value;
                                clearFieldError('#/name');
                            }}
                            placeholder="Food Name"
                            aria-label="Food Name"
                            aria-invalid={fieldErrors.has('#/name') || undefined}
                            aria-describedby={fieldErrors.has('#/name') ? `${nameId}-error` : undefined}
                        />
                        <FieldError id={`${nameId}-error`} message={fieldErrors.get('#/name')} />
                    </div>
                    <div className="flex flex-col flex-auto max-w-32 gap-1">
                        <input
                            id={unitId}
                            type="text"
                            value={tmpFood.unit}
                            onInput={(e) => {
                                tmpFood.unit = e.currentTarget.value;
                                clearFieldError('#/unit');
                            }}
                            placeholder="Portion Unit"
                            aria-label="Portion Unit"
                            aria-invalid={fieldErrors.has('#/unit') || undefined}
                            aria-describedby={fieldErrors.has('#/unit') ? `${unitId}-error` : undefined}
                        />
                        <FieldError id={`${unitId}-error`} message={fieldErrors.get('#/unit')} />
                    </div>
                </div>
                <NumberInput
                    id={portionId}
                    className="w-full"
                    innerClassName="w-full"
                    min={0}
                    label={'Portion'}
                    value={tmpFood.portion}
                    invalid={fieldErrors.has('#/portion')}
                    errorId={`${portionId}-error`}
                    onValueChange={(portion: number) => {
                        tmpFood.portion = portion;
                        clearFieldError('#/portion');
                        render();
                    }}
                />
                <FieldError id={`${portionId}-error`} message={fieldErrors.get('#/portion')} />
            </div>

            <div className="flex flex-wrap flex-col sm:flex-row justify-evenly gap-2">
                <NumberInput
                    className="flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Fat'}
                    min={0}
                    precision={4}
                    value={tmpFood.fat}
                    onValueChange={(fat: number) => {
                        tmpFood.fat = fat;
                        render();
                    }}
                />
                <NumberInput
                    className="flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Carb'}
                    min={0}
                    precision={4}
                    value={tmpFood.carb}
                    onValueChange={(carb: number) => {
                        tmpFood.carb = carb;
                        render();
                    }}
                />
                <NumberInput
                    className="flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Fibre'}
                    min={0}
                    precision={4}
                    value={tmpFood.fibre}
                    onValueChange={(fibre: number) => {
                        tmpFood.fibre = fibre;
                        render();
                    }}
                />
                <NumberInput
                    className="flex-1 flex-grow"
                    innerClassName="w-full min-w-12"
                    label={'Protein'}
                    min={0}
                    precision={4}
                    value={tmpFood.protein}
                    onValueChange={(protein: number) => {
                        tmpFood.protein = protein;
                        render();
                    }}
                />
            </div>

            <ErrorDiv errorMsg={errorMsg} />

            <div className="flex justify-end gap-2">
                <button onClick={onCancel}>Cancel</button>
                <button className="btn-success" aria-disabled={saving || undefined} onClick={onSaveClick}>
                    Create Food
                </button>
            </div>

            <details className="w-full">
                <summary className="cursor-pointer">Search data sources for food</summary>

                <div class="w-full pt-2">
                    {dataSources !== null && dataSources.length > 0 ? (
                        <FoodSearchPanel dataSources={dataSources} doRefresh={doRefresh} onChooseFood={onChooseFood} />
                    ) : (
                        'The server does not have any 3rd party data sources to search food.'
                    )}
                </div>
            </details>
        </div>
    );
}
