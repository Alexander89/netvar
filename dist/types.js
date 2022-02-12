"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.double = exports.float = exports.lReal = exports.real = exports.time = exports.dWore = exports.byte = exports.wString = exports.string = exports.word = exports.boolean = void 0;
const boolean = (idx, value = false) => ({
    idx,
    type: 'BOOL',
    value,
});
exports.boolean = boolean;
const word = (idx, value = 0) => ({
    idx,
    type: 'WORD',
    value,
});
exports.word = word;
const string = (idx, value = '') => ({
    idx,
    type: 'STRING',
    value,
});
exports.string = string;
const wString = (idx, value = '') => ({
    idx,
    type: 'WSTRING',
    value,
});
exports.wString = wString;
const byte = (idx, value = 0) => ({
    idx,
    type: 'BYTE',
    value,
});
exports.byte = byte;
const dWore = (idx, value = 0) => ({
    idx,
    type: 'DWORD',
    value,
});
exports.dWore = dWore;
const time = (idx, value = 0) => ({
    idx,
    type: 'TIME',
    value,
});
exports.time = time;
const real = (idx, value = 0) => ({
    idx,
    type: 'REAL',
    value,
});
exports.real = real;
const lReal = (idx, value = 0) => ({
    idx,
    type: 'LREAL',
    value,
});
exports.lReal = lReal;
/** @deprecated since V 1.0.5 */
exports.float = exports.real;
/** @deprecated since V 1.0.5 */
exports.double = exports.lReal;
