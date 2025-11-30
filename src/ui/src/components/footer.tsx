 /*keeping all footer code here for easy removability in future*/

 import { useState } from 'react';

 export function Footer(){
    const [fontSize, setFontSize] = useState(16); //default from the og files
 

    //toggle for light, dark themes
const toggleTheme=()=> {
   document.body.classList.toggle('light');
        document.body.classList.toggle('dark');
}


//font size handling 
const handleFontSize=(e: React.ChangeEvent<HTMLInputElement>) =>{
    const target = e.target as HTMLInputElement; //error pre this
    const newSize = parseInt(target.value, 10);
    setFontSize(newSize);
    document.body.style.fontSize = `${newSize}px`;
};



return (
    <footer className="flex flex-col items-center gap-4 p-4 border-c-white dark:border-c-black">
   
                    <label className=" relative inline-flex items-center cursor-pointer ml-4">
                        <input
                         type = "checkbox"
                         className="sr-only peer"
                         onChange={toggleTheme}
                         />
                         <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer dark:bg-gray-600 peer-checked:bg-yellow-500 transition-colors"></div>
                        < span className="ml-2 text-sm font-medium text-white dark:text-black">
                        Dark or Light Mode

                        </span>
                    </label>

<div className="flex items-center gap-2 w-full max-w-xs">
    <span className="text-sm text-white dark:text-black">A</span>
    <input 
    type="range"
    min = "16"
    max = "30"
    value = {fontSize}
    onChange={handleFontSize}
    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-point dark:bg-gray-600" //TODO: time-permitting add color change
    />
<span className="text-sm text-white dark:text-black">
    Font Size: {fontSize}px

</span>
</div>
</footer>
);
 }
