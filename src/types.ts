type NvBoolean = { idx: number; type: 'BOOL'; value: boolean }
type NvWord = { idx: number; type: 'WORD'; value: number }
type NvString = { idx: number; type: 'STRING'; value: string }
type NvByte = { idx: number; type: 'BYTE'; value: number }
type NvDWore = { idx: number; type: 'DWORD'; value: number }
type NvTime = { idx: number; type: 'TIME'; value: number }
type NvFloat = { idx: number; type: 'FLOAT'; value: number }
type NvDouble = { idx: number; type: 'DOUBLE'; value: number }

export type Types = NvBoolean | NvWord | NvString | NvByte | NvDWore | NvTime | NvFloat | NvDouble

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
export const float = (idx: number, value: number = 0): NvFloat => ({
  idx,
  type: 'FLOAT',
  value,
})
export const Double = (idx: number, value: number = 0): NvDouble => ({
  idx,
  type: 'DOUBLE',
  value,
})
