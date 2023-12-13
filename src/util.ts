import * as t from './types'

const nodeId = '002d5333'

export const d2h = (d: number, l: number): string => {
  // Handling negative numbers
  const isNegative = d < 0;
  let bn: bigint;

  if (isNegative) {
    bn = BigInt(d) & BigInt("0xFFFFFFFFFFFFFFFF"); // Adjust mask for 64 bits
  } else {
    bn = BigInt(d);
  }

  // Convert to hex and ensure the string length is even
  let hex = bn.toString(16);
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }

  // Convert to little-endian by reversing byte order
  let littleEndianHex = '';
  for (let i = 0; i < hex.length; i += 2) {
    littleEndianHex = hex.substring(i, i + 2) + littleEndianHex;
  }

  // Handle padding
  if (isNegative) {
    littleEndianHex = littleEndianHex.padEnd(l, 'f');
  } else {
    littleEndianHex = littleEndianHex.padEnd(l, '0');
  }

  // Ensure the length of the string matches the specified length
  return littleEndianHex.substring(0, l);
};

const mkValue = (def: t.Types): { data: string; lng: number } => {
  const defaultBufferSize = 8;
  let bufferSize = def.type === 'STRING' || def.type === 'WSTRING' ? 255 : defaultBufferSize;
  const out = Buffer.alloc(bufferSize);
  let lng = 0
  switch (def.type) {
    case 'BOOL':
      return { data: def.value ? '01' : '00', lng: 1 }
    case 'BYTE':
      lng = out.writeInt8(def.value)
      break
    case 'WORD':
      lng = out.writeUInt16LE(def.value)
      break
    case 'DWORD':
      lng = out.writeUInt32LE(def.value)
    case 'TIME':
      lng = out.writeInt32LE(def.value)
      break
    case 'REAL':
      lng = out.writeFloatLE(def.value)
      break
    case 'LREAL':
      lng = out.writeDoubleLE(def.value)
      break
    case 'STRING':
      lng = out.write(def.value, 'ascii')
      lng = out.writeInt8(0, lng)
      break
    case 'WSTRING':
      lng = out.write(def.value, 'utf16le')
      lng = out.writeInt16LE(0, lng)
      break
  }

  return {
    data: out.subarray(0, lng).toString('hex'),
    lng,
  }
}
const mkLng = (lng: number): string => {
  const lngBuf = Buffer.alloc(2)
  lngBuf.writeUInt16LE(lng + 20) // 20 is for the header
  return lngBuf.toString('hex')
}

export const msgStr = <T extends { [k: string]: t.Types; }>(getCounter: (key: keyof T) => number, send: Partial<T>) => {
  return Object.entries(send)
    .filter((toSend): toSend is [string, t.Types] => true)
    .map(([name, toSend]) => {
      const { data, lng } = mkValue(toSend)
      return {
        idx: d2h(toSend.idx, 2),
        counter: d2h(getCounter(name), 2),
        data,
        lng: mkLng(lng),
      }
    })
}

export const packedMsgStr = <T extends { [k: string]: t.Types }>(listIdStr: string, sendCounter: number, sortedIdx: string[], write_state: T) => {
  const counter = d2h(sendCounter, 4)
  const vars = sortedIdx.map((name) => {
    return mkValue(write_state[name])
  })
  const lng = d2h(vars.reduce((sum, current) => sum + current.lng, 0) + 20, 4) //add 20 bytes for the header
  const data = vars.map((current, _lng) => current.data).join('')
  const items = d2h(vars.length, 4)
  return `${nodeId}00000000${listIdStr}0000${items}${lng}${counter}0000${data}`
}
