import {BaseState} from '../../state/basestate';
import {useEffect, useState} from 'preact/hooks';
import {UserEventFoodLog} from '../../api/types';

import {RenderGraph} from './single_line_graph';
import {RenderMultiLineGraph} from './multi_line_graph';
import {PieChart} from './pie_chart';
import {ChartPoint, MacroPoint, MacroTotals, MacroType, RangeType} from './common';

import {Within24Hour, WithinMonth, WithinWeek} from '../../utils/time';
import {CalculateCalories, Str2CalorieFormula} from '../../utils/calories';

export function BodyPage(state: BaseState) {
    return (
        <>
            <div className="w-full flex justify-evenly my-4">
                <button
                    className={`w-24 ${showNewEventPanel && 'bg-c-l-red'}`}
                    onClick={() => {
                        setShowNewEventPanel((x) => !x);
                        setNewEvent(UserEventFoodLogFactory.empty());
                    }}
                >
                    {!showNewEventPanel ? 'New Event' : 'Cancel'}
                </button>

                <NumberInput
                    label={'Show Last'}
                    min={1}
                    step={5}
                    value={numberToShow}
                    onValueChange={setNumberToShow}
                    numberList={[1, 2, 5, 10, 20, 50]}
                />

                <DropdownButton
                    buttonClassName="w-full h-full"
                    className="w-24"
                    label="Export"
                    actions={[
                        {
                            label: 'As Text Render',
                            onClick: () => {
                                const blob = new Blob([GenerateEventTableText(state.user, state.eventlogs)], {
                                    type: 'text/plain; charset=utf-8',
                                });
                                DownloadData(blob, 'eventlogs.txt');
                            },
                        },
                        {
                            label: 'As JSON',
                            onClick: () => {
                                const jsonStr = JSON.stringify(state.eventlogs, null, 2);
                                const blob = new Blob([jsonStr], {type: 'application/json'});
                                DownloadData(blob, 'eventlogs.json');
                            },
                        },
                    ]}
                />
            </div>

            {errorMsg !== null && <div className="text-c-l-red">{errorMsg}</div>}
        </>
    );
}
