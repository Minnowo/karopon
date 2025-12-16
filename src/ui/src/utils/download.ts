import {TblUser, UserEventFoodLog} from '../api/types';
import {CalculateCalories, Str2CalorieFormula} from './calories';
import {formatSmartTimestamp} from './date_utils';

/**
 * Trigger a download of any Blob data with the specified filename.
 * @param data Blob object to download
 * @param filename Name of the file to save as
 */
export function DownloadData(data: Blob, filename: string) {
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
}

export const GenerateEventTableText = (user: TblUser, events: UserEventFoodLog[]): string => {
    return events
        .map((eventItem) => {
            const {eventlog, foodlogs, total_protein, total_carb, total_fibre, total_fat} = eventItem;

            const foodRows = new Array<string[]>(foodlogs.length + 2);
            foodRows[0] = ['Name', 'Portion', 'Unit', 'Protein', 'Carb', 'Fibre', 'Fat', 'NetCarb'];
            foodRows[1] = ['----', '-------', '----', '-------', '----', '-----', '---', '-------'];
            foodRows[2] = [
                'Totals',
                '-',
                '-',
                total_protein.toFixed(1),
                total_carb.toFixed(1),
                total_fibre.toFixed(1),
                total_fat.toFixed(1),
                (total_carb - total_fibre).toFixed(1),
            ];
            foodRows[3] = ['----', '-------', '----', '-------', '----', '-----', '---', '-------'];
            for (let i = 0; i < foodlogs.length; i++) {
                const food = foodlogs[i];
                foodRows[i + 3] = [
                    food.name,
                    food.unit,
                    food.portion.toFixed(1),
                    food.protein.toFixed(1),
                    food.carb.toFixed(1),
                    food.fibre.toFixed(1),
                    food.fat.toFixed(1),
                    (food.carb - food.fibre).toFixed(1),
                ];
            }

            const foodColWidths = foodRows[0].map((h: string, i: number) => {
                return Math.max(h.length, ...foodRows.map((row) => row[i].length));
            });

            const maxLen = ' | '.length * foodRows[0].length + foodColWidths.reduce((sum: number, w: number) => sum + w, 0);

            return [
                '-'.repeat(maxLen),
                `Time                    ${formatSmartTimestamp(eventlog.user_time)}`,
                `Event Title             ${eventlog.event}`,
                user.show_diabetes
                    ? [
                          `Blood Sugar             ${eventlog.blood_glucose.toFixed(2)}`,
                          `Blood Sugar Target      ${eventlog.blood_glucose_target.toFixed(2)}`,
                          `Insulin Sensitivity     ${eventlog.insulin_sensitivity_factor.toFixed(2)}`,
                          `Insulin To Carb Ratio   ${eventlog.insulin_to_carb_ratio.toFixed(2)}`,
                          `Insulin Rec             ${eventlog.recommended_insulin_amount.toFixed(2)}`,
                          `Insulin Taken           ${eventlog.actual_insulin_taken.toFixed(2)}`,
                      ].join('\n')
                    : null,
                `Calories                ${CalculateCalories(
                    total_protein,
                    total_carb - total_fibre,
                    total_fibre,
                    total_fat,
                    Str2CalorieFormula(user.caloric_calc_method)
                ).toFixed(2)}`,
                '-'.repeat(maxLen),
                foodRows.map((row) => row.map((v, i) => v.padEnd(foodColWidths[i], ' ')).join(' | ')).join('\n'),
                '-'.repeat(maxLen),
            ]
                .filter((x) => x !== null)
                .join('\n');
        })
        .join('\n\n\n\n');
};
