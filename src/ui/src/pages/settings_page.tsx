import {useEffect, useState} from 'preact/hooks';
import {BaseState} from '../state/basestate';

type ItemCheckBox = {
    label: string;
    data: boolean;
};

function InputItemCheckBox({label, data}: ItemCheckBox){
    const [target, setForm] = useState<boolean>(data);

    return (
        <div className="flex space-x-5">
            <span>{label} </span>
            <input type="checkbox"></input>
        </div>
    )
}

type ItemInputField = {
    label: string;
    data: string | number;
};

function InputItemInputField({label, data}: ItemInputField){
    const [target, setForm] = useState<string | number>(data);

    return (
        <div className="flex space-x-5">
            <span>{label} </span>
            <input type=""></input>
        </div>
    )
}

export function SettingsPage(state: BaseState) {
    const [darkMode, setDarkMode] = useState<boolean>(state.settings?.dark_mode ?? true);
    const [showDiabetes, setShowDiabetes] = useState<boolean>(state.settings?.show_diabetes ?? true);
    const [caloricCalcMethod, setCaloricCalcMethod] = useState<string>(state.settings?.caloric_calc_method ?? 'auto');
    const [insulinSensitivityFactor, setInsulinSensitivityFactor] = useState<number>(state.settings?.insulin_sensitivity_factor ?? 0.01);
    
    useEffect(() => {
        console.log(state.settings);
    }, []);

    return (
        <main className="flex flex-col ml-10 space-y-10">
            
            <span>USER_ID: {state.settings?.user_id}</span>

            <hr></hr>

            <div>
                <span>Site Settings</span>
                <div className="flex flex-col items-center">
                    <InputItemCheckBox label='Dark Mode' data={darkMode}></InputItemCheckBox>
                </div>
            </div>

            <hr></hr>
            
            <div>
                <span>Calculation Settings</span>
                <div className="flex flex-col items-center">
                    <InputItemInputField label="Insulin Sensitivity Factor" data={insulinSensitivityFactor}></InputItemInputField>
                    <InputItemInputField label="Caloric calculation method" data={caloricCalcMethod}></InputItemInputField>
                </div>
            </div>

            <hr></hr>

            <div>
                <span>Preference Settings</span>
                <div className="flex flex-col items-center">
                    <InputItemCheckBox label='Show Diabetes' data={showDiabetes}></InputItemCheckBox>
                </div>
            </div>
            
            <hr></hr>

            <button>Submit</button>
        </main>
    );
}
