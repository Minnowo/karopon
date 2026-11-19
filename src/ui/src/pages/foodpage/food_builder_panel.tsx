import {useId, useState, useRef, useMemo} from 'preact/hooks';
import {TblUser, TblUserFood, TblUserFoodLog, TblUserFoodLogWithKey} from '../../api/types';
import {NumberInput} from '../../components/number_input';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {EditorDialog} from '../../components/editor_dialog';
import {FieldError} from '../../components/field_error';
import {ApiError} from '../../api/api';
import {DoRender} from '../../hooks/doRender';
import {TblUserFoodLogFactory} from '../../api/factories';
import {AddFoodlogPanelRow} from '../../components/add_foodlog_row';

type FoodBuilderPanelProps = {
    user: TblUser;
    foods: TblUserFood[];
    // Saves the built food; rejects with the API error so the dialog can show it.
    addFood: (food: TblUserFood) => Promise<void>;
    onCancel: () => void;
};

export const FoodBuilderPanel = (p: FoodBuilderPanelProps) => {
    // Used for the foods array key={} when rendering the food list.
    // The foods array is a ref which is passed into the row component, where it is edited by ref.
    // This ensures that each row in the array has a unique key for proper re-render.
    const keyRef = useRef<number>(-1);

    const mutateWithKey = (l: TblUserFoodLog): TblUserFoodLogWithKey => {
        (l as TblUserFoodLogWithKey).key = --keyRef.current;
        return l as TblUserFoodLogWithKey;
    };

    const [errorMsg, setErrorMsg] = useState<ErrorDivMsg | null>(null);
    // The server checks the new food; its field errors, by JSON Pointer.
    const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(new Map());
    const [saving, setSaving] = useState<boolean>(false);
    const baseId = useId();
    const fieldIds = new Map<string, string>([
        ['#/name', `${baseId}-name`],
        ['#/unit', `${baseId}-unit`],
        ['#/portion', `${baseId}-portion`],
    ]);
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
    const food = useRef<TblUserFood>({
        id: 0,
        user_id: 0,
        name: '',
        unit: '',
        portion: 0,
        protein: 0,
        carb: 0,
        fibre: 0,
        fat: 0,
    });
    const foods = useMemo<TblUserFoodLogWithKey[]>(
        () => [
            mutateWithKey(TblUserFoodLogFactory.empty()),
            mutateWithKey(TblUserFoodLogFactory.empty()),
            mutateWithKey(TblUserFoodLogFactory.empty()),
        ],
        [
            /* never changes */
        ]
    );
    const render = DoRender();

    const totals = (() => {
        const cols = [0, 0, 0, 0];
        for (let i = 0; i < foods.length; i++) {
            if (foods[i].portion !== 0 && foods[i].name !== '') {
                cols[0] += foods[i].protein;
                cols[1] += foods[i].carb;
                cols[2] += foods[i].fibre;
                cols[3] += foods[i].fat;
            }
        }
        return {
            protein: cols[0],
            carb: cols[1],
            fibre: cols[2],
            fat: cols[3],
        };
    })();

    const onCreateClick = () => {
        // aria-disabled rather than disabled while saving, so the button keeps focus for keyboard users.
        if (saving) {
            return;
        }
        setErrorMsg(null);
        setFieldErrors(new Map());
        setSaving(true);

        const newFood: TblUserFood = {
            ...food.current,
            name: food.current.name.trim(),
            unit: food.current.unit.trim(),
            protein: totals.protein,
            carb: totals.carb,
            fibre: totals.fibre,
            fat: totals.fat,
        };

        p.addFood(newFood)
            .catch((e: unknown) => {
                if (!(e instanceof ApiError)) {
                    setErrorMsg(e instanceof Error ? e : String(e));
                    return;
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

    const summary = (
        <dl className="editor-summary">
            <div>
                <dt>Fat</dt>
                <dd>{totals.fat.toFixed(1)}</dd>
            </div>
            <div>
                <dt>Carbs</dt>
                <dd>{totals.carb.toFixed(1)}</dd>
            </div>
            <div>
                <dt>Fibre</dt>
                <dd>{totals.fibre.toFixed(1)}</dd>
            </div>
            <div>
                <dt>Protein</dt>
                <dd>{totals.protein.toFixed(1)}</dd>
            </div>
        </dl>
    );

    return (
        <EditorDialog
            title="Food Builder"
            saveLabel="Build Food"
            saving={saving}
            onSave={onCreateClick}
            onClose={p.onCancel}
            summary={summary}
        >
            <div>
                <details className="w-full">
                    <summary className="cursor-pointer">How to build a food</summary>

                    <div className="flex flex-col gap-2 pt-2">
                        <p>Combine existing foods to create a new food. Best for home cooking and recipes.</p>

                        <h4>Example: home cooking</h4>

                        <ol className="list-decimal list-inside space-y-1">
                            <li>Add each ingredient as its own food.</li>
                            <li>Enter the amount of each ingredient in the table below.</li>
                            <li>Cook the food.</li>
                            <li>
                                Weigh the final result
                                <strong> (important!)</strong> - this should be the total cooked weight of everything.
                            </li>
                            <li>Give the food a name, then enter the final weight and unit of measure.</li>
                            <li>Build the food.</li>
                        </ol>

                        <h4>Example: baking 3-ingredient cookies</h4>

                        <ol className="list-decimal list-inside space-y-1">
                            <li>
                                Add these ingredients as separate foods:
                                <ul className="list-disc list-inside ml-4">
                                    <li>Peanut butter</li>
                                    <li>Sugar</li>
                                    <li>Eggs</li>
                                </ul>
                            </li>
                            <li>
                                Enter the portions for each ingredient in the table (e.g., 1 cup peanut butter, 1/2 cup sugar, 1
                                egg).
                            </li>
                            <li>Mix and bake your cookies.</li>
                            <li>Weigh the total batch after baking.</li>
                            <li>
                                Name your food (e.g., "Peanut Butter Cookies") and enter the final weight and unit (e.g., 12
                                cookies / 300g).
                            </li>
                            <li>Build the food to save it.</li>
                        </ol>
                    </div>
                </details>
            </div>

            <h3>Ingredients</h3>
            <ul aria-label="Ingredients" className="flex flex-col gap-2">
                {foods.map((f: TblUserFoodLogWithKey, index: number) => (
                    <AddFoodlogPanelRow
                        key={f.key}
                        user={p.user}
                        foods={p.foods}
                        food={f}
                        render={render}
                        deleteSelf={() => {
                            foods.splice(index, 1);
                            render();
                        }}
                        showNetCarb={false}
                        showCalories={false}
                    />
                ))}
            </ul>
            <button
                type="button"
                className="self-start"
                onClick={() => {
                    foods.push(mutateWithKey(TblUserFoodLogFactory.empty()));
                    render();
                }}
            >
                Add Row
            </button>

            <div className="flex flex-col gap-2">
                <h3>The new food</h3>
                <div className="flex flex-row flex-wrap gap-2">
                    <div className="flex flex-auto flex-col gap-1">
                        <input
                            id={fieldIds.get('#/name')}
                            type="text"
                            value={food.current.name}
                            onInput={(e) => {
                                food.current.name = e.currentTarget.value;
                                clearFieldError('#/name');
                            }}
                            placeholder="Food Name"
                            aria-label="Food Name"
                            aria-invalid={fieldErrors.has('#/name') || undefined}
                            aria-describedby={fieldErrors.has('#/name') ? `${baseId}-name-error` : undefined}
                        />
                        <FieldError id={`${baseId}-name-error`} message={fieldErrors.get('#/name')} />
                    </div>
                    <div className="flex flex-auto flex-col gap-1 sm:max-w-32">
                        <input
                            id={fieldIds.get('#/unit')}
                            type="text"
                            value={food.current.unit}
                            onInput={(e) => {
                                food.current.unit = e.currentTarget.value;
                                clearFieldError('#/unit');
                            }}
                            placeholder="Portion Unit"
                            aria-label="Portion Unit"
                            aria-invalid={fieldErrors.has('#/unit') || undefined}
                            aria-describedby={fieldErrors.has('#/unit') ? `${baseId}-unit-error` : undefined}
                        />
                        <FieldError id={`${baseId}-unit-error`} message={fieldErrors.get('#/unit')} />
                    </div>
                </div>
                <NumberInput
                    id={fieldIds.get('#/portion')}
                    className={'w-full'}
                    innerClassName={'w-full'}
                    min={0}
                    label={'Portion'}
                    value={food.current.portion}
                    invalid={fieldErrors.has('#/portion')}
                    errorId={`${baseId}-portion-error`}
                    onValueChange={(portion: number) => {
                        food.current.portion = portion;
                        clearFieldError('#/portion');
                        render();
                    }}
                />
                <FieldError id={`${baseId}-portion-error`} message={fieldErrors.get('#/portion')} />
            </div>

            <ErrorDiv errorMsg={errorMsg} />
        </EditorDialog>
    );
};
