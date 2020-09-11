type NvBoolean = { idx: number; type: 'BOOL'; value: boolean }
type NvWord = { idx: number; type: 'WORD'; value: number }
type NvString = { idx: number; type: 'STRING'; value: string }
type NvWString = { idx: number; type: 'WSTRING'; value: string }
type NvByte = { idx: number; type: 'BYTE'; value: number }
type NvDWore = { idx: number; type: 'DWORD'; value: number }
type NvTime = { idx: number; type: 'TIME'; value: number }
type NvReal = { idx: number; type: 'REAL'; value: number }
type NvLReal = { idx: number; type: 'LREAL'; value: number }

export type Types =
  | NvBoolean
  | NvWord
  | NvString
  | NvWString
  | NvByte
  | NvDWore
  | NvTime
  | NvReal
  | NvLReal

export const boolean = (idx: number, value: boolean = false): NvBoolean => ({
  idx,
  type: 'BOOL',
  value,
})

export const word = (idx: number, value: number = 0): NvWord => ({
  idx,
  type: 'WORD',
  value,
})

export const string = (idx: number, value: string = ''): NvString => ({
  idx,
  type: 'STRING',
  value,
})

export const wString = (idx: number, value: string = ''): NvWString => ({
  idx,
  type: 'WSTRING',
  value,
})

export const byte = (idx: number, value: number = 0): NvByte => ({
  idx,
  type: 'BYTE',
  value,
})

export const dWore = (idx: number, value: number = 0): NvDWore => ({
  idx,
  type: 'DWORD',
  value,
})

export const time = (idx: number, value: number = 0): NvTime => ({
  idx,
  type: 'TIME',
  value,
})

export const real = (idx: number, value: number = 0): NvReal => ({
  idx,
  type: 'REAL',
  value,
})

export const lReal = (idx: number, value: number = 0): NvLReal => ({
  idx,
  type: 'LREAL',
  value,
})

/** @deprecated since V 1.0.5 */
export const float = real
/** @deprecated since V 1.0.5 */
export const double = lReal
