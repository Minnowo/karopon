import {useEffect, useState} from 'preact/hooks';
import {BaseState} from '../state/basestate';

type ItemCheckBox = {
    label: string;
    data: boolean;
};

function InputItemCheckBox({label, data}: ItemCheckBox) {
    const [target, setForm] = useState<boolean>(data);

    return (
        <div className="flex space-x-5">
            <span>{label} </span>
            <input type="checkbox"></input>
        </div>
    );
}

type ItemInputField = {
    label: string;
    data: string | number;
};

function InputItemInputField({label, data}: ItemInputField) {
    const [target, setForm] = useState<string | number>(data);

    return (
        <div className="flex space-x-5">
            <span>{label} </span>
            <input type="" />
        </div>
    );
}

export function SettingsPage(state: BaseState) {
    const [darkMode, setDarkMode] = useState<boolean>(state.user.dark_mode);
    const [showDiabetes, setShowDiabetes] = useState<boolean>(state.user.show_diabetes);
    const [caloricCalcMethod, setCaloricCalcMethod] = useState<string>(state.user.caloric_calc_method);
    const [insulinSensitivityFactor, setInsulinSensitivityFactor] = useState<number>(state.user.insulin_sensitivity_factor);

    useEffect(() => {
        setDarkMode(state.user.dark_mode);
        setShowDiabetes(state.user.show_diabetes);
        setCaloricCalcMethod(state.user.caloric_calc_method);
        setInsulinSensitivityFactor(state.user.insulin_sensitivity_factor);
    }, [state.user]);

    return (
        <main className="flex flex-col ml-10 space-y-10">
            <div>
                <span>Site Settings</span>
                <div className="flex flex-col items-center">
                    <InputItemCheckBox label="Dark Mode" data={darkMode} />
                </div>
            </div>

            <div>
                <span>Calculation Settings</span>
                <div className="flex flex-col items-center">
                    <InputItemInputField label="Insulin Sensitivity Factor" data={insulinSensitivityFactor} />
                    <InputItemInputField label="Caloric calculation method" data={caloricCalcMethod} />
                </div>
            </div>

            <div>
                <span>Preference Settings</span>
                <div className="flex flex-col items-center">
                    <InputItemCheckBox label="Show Diabetes" data={showDiabetes} />
                </div>
            </div>

            <button>Submit</button>
        </main>
    );
}
