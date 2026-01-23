import {TblUserTag} from '../api/types';



export const HasNamespace = (tagStr: string): boolean => {
    return tagStr.indexOf(':') !== -1;
};
export const SplitTag = (tagStr: string): TblUserTag => {
    const s = tagStr.trim().split(':', 2);

    return {
        namespace: s.length === 2 ? s[0] : '',
        name: s.length === 2 ? s[1] : s[0],
    } as TblUserTag;
};
