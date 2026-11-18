import {useState, useRef, useId} from 'preact/hooks';
import {TblUser, TblUserFood} from '../../api/types';
import {DropdownButton} from '../../components/drop_down_button';
import {DoRender} from '../../hooks/doRender';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';
import {ErrorDiv, ErrorDivMsg} from '../../components/error_div';
import {FieldError} from '../../components/field_error';
import {ApiError} from '../../api/api';
import {NumberInput} from '../../components/number_input';

type FoodEditPanelProps = {
    user: TblUser;
    food: TblUserFood;
    // Saves the food; rejects with an ApiError when the server refuses it.
    updateFood: (_food: TblUserFood) => Promise<void>;
    deleteFood?: (food: TblUserFood) => void;
    copyFood?: (food: TblUserFood) => void;
};

export const FoodEditPanel = ({user, food, updateFood, copyFood, deleteFood}: FoodEditPanelProps) => {
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
    const [showUpdatePanel, setShowUpdatePanel] = useState<boolean>(false);
    const [portion, setPortion] = useState<number>(food.portion);
    const tmpFood = useRef<TblUserFood>({...food});

    const render = DoRender();

    const onEditClicked = () => {
        tmpFood.current = {
            id: food.id,
            user_id: food.user_id,
            name: food.name,
            unit: food.unit,
            fat: food.fat * portion,
            carb: food.carb * portion,
            fibre: food.fibre * portion,
            protein: food.protein * portion,
            portion,
        };
        setShowUpdatePanel(true);
    };

    const onCancelClick = () => {
        setShowUpdatePanel(false);
        setErrorMsg(null);
        setFieldErrors(new Map());
    };

    const onSaveClick = () => {
        // aria-disabled rather than disabled while saving, so the button keeps focus for keyboard users.
        if (saving) {
            return;
        }
        setErrorMsg(null);
        setFieldErrors(new Map());
        setSaving(true);

        const newFood = {...food, ...tmpFood.current};
        newFood.name = newFood.name.trim();
        newFood.unit = newFood.unit.trim();

        updateFood(newFood)
            .then(() => setShowUpdatePanel(false))
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

    return (
        <div className="w-full surface-1 flex flex-col gap-2">
            <div className="flex justify-between gap-2">
                {showUpdatePanel ? (
                    <>
                        <div class="w-full flex flex-col gap-2">
                            <input
                                id={nameId}
                                class="wsnw w-full"
                                type="text"
                                onInput={(e) => {
                                    tmpFood.current.name = e.currentTarget.value;
                                    clearFieldError('#/name');
                                }}
                                value={tmpFood.current.name}
                                placeholder="Food Name"
                                aria-label="Food Name"
                                aria-invalid={fieldErrors.has('#/name') || undefined}
                                aria-describedby={fieldErrors.has('#/name') ? `${nameId}-error` : undefined}
                            />
                            <FieldError id={`${nameId}-error`} message={fieldErrors.get('#/name')} />
                            <input
                                id={unitId}
                                class="wsnw w-full"
                                type="text"
                                onInput={(e) => {
                                    tmpFood.current.unit = e.currentTarget.value;
                                    clearFieldError('#/unit');
                                }}
                                value={tmpFood.current.unit}
                                placeholder="Portion Unit"
                                aria-label="Portion Unit"
                                aria-invalid={fieldErrors.has('#/unit') || undefined}
                                aria-describedby={fieldErrors.has('#/unit') ? `${unitId}-error` : undefined}
                            />
                            <FieldError id={`${unitId}-error`} message={fieldErrors.get('#/unit')} />
                            <NumberInput
                                id={portionId}
                                className={'wsnw'}
                                innerClassName="w-full"
                                label={'Portion'}
                                value={tmpFood.current.portion}
                                invalid={fieldErrors.has('#/portion')}
                                errorId={`${portionId}-error`}
                                onValueChange={(p: number) => {
                                    tmpFood.current.portion = p;
                                    clearFieldError('#/portion');
                                    render();
                                }}
                            />
                            <FieldError id={`${portionId}-error`} message={fieldErrors.get('#/portion')} />
                            <ErrorDiv errorMsg={errorMsg} />
                        </div>

                        <div class="flex flex-col gap-2">
                            <button class="w-full" onClick={onCancelClick}>
                                Cancel
                            </button>
                            <button class="w-full btn-success" aria-disabled={saving || undefined} onClick={onSaveClick}>
                                Update
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="w-full flex flex-col gap-2">
                        <div className="w-full flex flex-row">
                            <h2 className="w-full">{food.name}</h2>
                            <DropdownButton
                                actions={[
                                    {
                                        label: 'Copy',
                                        onClick: () => {
                                            if (copyFood) {
                                                copyFood({
                                                    id: food.id,
                                                    user_id: food.user_id,
                                                    name: food.name,
                                                    unit: food.unit,
                                                    fat: food.fat * portion,
                                                    carb: food.carb * portion,
                                                    fibre: food.fibre * portion,
                                                    protein: food.protein * portion,
                                                    portion,
                                                });
                                            }
                                        },
                                    },
                                    {label: 'Edit', onClick: onEditClicked},
                                    {
                                        label: 'Delete',

                                        dangerous: true,
                                        onClick: () => {
                                            if (deleteFood) {
                                                deleteFood(food);
                                            }
                                        },
                                    },
                                ]}
                            />
                        </div>
                        <div className="w-full flex flex-row items-center justify-between">
                            <NumberInput
                                innerClassName="w-24"
                                label={food.unit}
                                min={0}
                                value={portion}
                                onValueChange={setPortion}
                            />
                            <span>
                                {`Calories ${CalculateCalories(
                                    food.protein * portion,
                                    (food.carb - food.fibre) * portion,
                                    food.fibre * portion,
                                    food.fat * portion,
                                    Str2CalorieFormula(user.caloric_calc_method)
                                ).toFixed(1)}`}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {showUpdatePanel ? (
                <div className="flex flex-wrap gap-2">
                    <NumberInput
                        className={'wsnw'}
                        innerClassName="w-16"
                        label={'Fat'}
                        value={tmpFood.current.fat}
                        precision={3}
                        onValueChange={(fat: number) => {
                            tmpFood.current.fat = fat;
                            render();
                        }}
                    />
                    <NumberInput
                        className={'wsnw'}
                        innerClassName="w-16"
                        label={'Carb'}
                        value={tmpFood.current.carb}
                        precision={3}
                        onValueChange={(carb: number) => {
                            tmpFood.current.carb = carb;
                            render();
                        }}
                    />
                    <NumberInput
                        className={'wsnw'}
                        innerClassName="w-16"
                        label={'Fibre'}
                        value={tmpFood.current.fibre}
                        precision={3}
                        onValueChange={(fibre: number) => {
                            tmpFood.current.fibre = fibre;
                            render();
                        }}
                    />
                    <NumberInput
                        className={'wsnw'}
                        innerClassName="w-16"
                        label={'Protein'}
                        value={tmpFood.current.protein}
                        precision={3}
                        onValueChange={(protein: number) => {
                            tmpFood.current.protein = protein;
                            render();
                        }}
                    />
                </div>
            ) : (
                <>
                    <div class="w-full">
                        <div class="flex flex-col gap-2 sm:hidden">
                            <div class="flex justify-between">
                                <span>Fat</span>
                                <span>{(food.fat * portion).toFixed(3)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Carbs</span>
                                <span>{(food.carb * portion).toFixed(3)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Fibre</span>
                                <span>{(food.fibre * portion).toFixed(3)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Protein</span>
                                <span>{(food.protein * portion).toFixed(3)}</span>
                            </div>
                        </div>

                        <div class="hidden sm:flex flex-col gap-1 w-full">
                            <div class="flex w-full">
                                <small class="flex-1">Fat</small>
                                <small class="flex-1">Carbs</small>
                                <small class="flex-1">Fibre</small>
                                <small class="flex-1">Protein</small>
                            </div>

                            <div class="flex w-full">
                                <div class="flex-1">{(food.fat * portion).toFixed(3)}</div>
                                <div class="flex-1">{(food.carb * portion).toFixed(3)}</div>
                                <div class="flex-1">{(food.fibre * portion).toFixed(3)}</div>
                                <div class="flex-1">{(food.protein * portion).toFixed(3)}</div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
