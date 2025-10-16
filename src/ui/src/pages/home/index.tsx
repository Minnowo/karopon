
import {useState} from 'preact/hooks';
import {BaseState} from '../../state/basestate';
import {TblUserFood} from '../../api/types';
import {FoodEditPanel} from '../../components/food_edit_panel';
import {ErrorDiv} from '../../components/error_div';

export function HomePage(state: BaseState) {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-4">
            <ErrorDiv errorMsg={errorMsg} />

            <div className="w-full space-y-4">


            </div>
        </div>
    );
}
