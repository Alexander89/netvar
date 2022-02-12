declare type NvBoolean = {
    idx: number;
    type: 'BOOL';
    value: boolean;
};
declare type NvWord = {
    idx: number;
    type: 'WORD';
    value: number;
};
declare type NvString = {
    idx: number;
    type: 'STRING';
    value: string;
};
declare type NvWString = {
    idx: number;
    type: 'WSTRING';
    value: string;
};
declare type NvByte = {
    idx: number;
    type: 'BYTE';
    value: number;
};
declare type NvDWord = {
    idx: number;
    type: 'DWORD';
    value: number;
};
declare type NvTime = {
    idx: number;
    type: 'TIME';
    value: number;
};
declare type NvReal = {
    idx: number;
    type: 'REAL';
    value: number;
};
declare type NvLReal = {
    idx: number;
    type: 'LREAL';
    value: number;
};
export declare type Types = NvBoolean | NvWord | NvString | NvWString | NvByte | NvDWord | NvTime | NvReal | NvLReal;
export declare const boolean: (idx: number, value?: boolean) => NvBoolean;
export declare const word: (idx: number, value?: number) => NvWord;
export declare const string: (idx: number, value?: string) => NvString;
export declare const wString: (idx: number, value?: string) => NvWString;
export declare const byte: (idx: number, value?: number) => NvByte;
export declare const dWore: (idx: number, value?: number) => NvDWord;
export declare const time: (idx: number, value?: number) => NvTime;
export declare const real: (idx: number, value?: number) => NvReal;
export declare const lReal: (idx: number, value?: number) => NvLReal;
/** @deprecated since V 1.0.5 */
export declare const float: (idx: number, value?: number) => NvReal;
/** @deprecated since V 1.0.5 */
export declare const double: (idx: number, value?: number) => NvLReal;
export {};
