// The food area: the event log and the saved-food
// library, as two tabs of one page.

import {BaseState} from '../../state/basestate';
import {Tabs} from '../../components/tabs';
import {EventsPage} from '../eventpage';
import {FoodPage} from '../foodpage';

export const FOOD_LOG_ROUTE = '#food';
export const FOOD_LIBRARY_ROUTE = '#food/library';

// OLD_FOOD_ROUTES maps the routes of the former events and foods pages to
// their tabs, so old links and bookmarks still work.
export const OLD_FOOD_ROUTES: Record<string, string> = {
    '#events': FOOD_LOG_ROUTE,
    '#foods': FOOD_LIBRARY_ROUTE,
};

const FOOD_TABS = [
    {href: FOOD_LOG_ROUTE, label: 'Log'},
    {href: FOOD_LIBRARY_ROUTE, label: 'Foods'},
];

type FoodAreaProps = BaseState & {
    // The hash route that opened the page; picks the tab.
    route: string;
};

export function FoodAreaPage({route, ...state}: FoodAreaProps) {
    const selected = route === FOOD_LIBRARY_ROUTE ? FOOD_LIBRARY_ROUTE : FOOD_LOG_ROUTE;

    return (
        <div className="pt-4">
            <Tabs label="Food" tabs={FOOD_TABS} selected={selected}>
                {selected === FOOD_LIBRARY_ROUTE ? <FoodPage {...state} /> : <EventsPage {...state} />}
            </Tabs>
        </div>
    );
}
