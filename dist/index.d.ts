import * as t from './types';
export * as t from './types';
export declare type Options = {
    listId: number;
    onChange?: (name: string, value: any) => void;
    cyclic?: boolean;
    cycleInterval?: number;
};
export declare const client: (endpoint?: string, port?: number) => {
    openList: <T extends {
        [k: string]: t.Types;
    }>(options: Options, vars: T) => {
        set: <K extends keyof T>(name: K, value: T[K]["value"]) => void;
        setMore: (set: { [K_1 in keyof T]?: T[K_1]["value"] | undefined; }) => void;
        get: <K_2 extends keyof T>(name: K_2) => T[K_2]["value"];
        definition: string;
        dispose: () => void;
    };
};
