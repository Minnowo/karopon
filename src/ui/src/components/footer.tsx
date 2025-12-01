 /*keeping all footer code here for easy removability in future*/

 import { useState, useEffect } from 'preact/hooks';

 //material tonal paletter


 export function Footer(){
    const [fontSize, setFontSize] = useState(16); //default from the og files
 
    useEffect(() => {
        if (!document.body.classList.contains('light') && !document.body.classList.contains('dark')){
            document.body.classList.add('dark');
        }
    },[]);


    //toggle for light, dark themes
const toggleTheme=()=> {
        document.body.classList.toggle('light');
        document.body.classList.toggle('dark');
}


//font size handling 
const handleFontSize=(e: Event) =>{
    const target = e.target as HTMLInputElement; //error pre this
    const newSize = parseInt(target.value, 10);
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${newSize}px`;
};



return (
    <div className="fixed bottom-4 right-4 flex flex-col items-end gap-4 bg-c-d-black border border-c-yellow rounded-lg p-4 shadow-lg z-50">
   
                    <label className=" relative inline-flex items-center cursor-pointer">
                        <input
                         type = "checkbox"
                         className="sr-only peer"
                         onChange={toggleTheme}
                         />
                         <div className="w-12 h-6 bg-cl-black peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer  peer-checked:bg-c-yellow transition-colors"></div>
                        < span className="ml-2 text-sm font-medium text-c-white ">
                        Dark or Light Mode
                        </span>
                    </label>

<div className="flex items-center gap-2">
    <span className="text-sm text-c-white ">A</span>
    <input 
    type="range"
    min = "16"
    max = "30"
    value = {fontSize}
    onInput={handleFontSize}
    className="w-32 h-2 bg-c-yellow peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-c-l-yellow rounded-lg appearance-none cursor-pointer " //TODO: time-permitting add color change
    />
<span className="text-sm text-c-white ">
    Font Size: {fontSize}px

</span>
</div>
</div>
);
 }
