import {createContext} from 'preact';

export const TimeNowContext = createContext<number>(Date.now());
