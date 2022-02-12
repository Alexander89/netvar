import { createSocket } from 'dgram'
import * as t from './types'

export * as t from './types'

export type Options = {
  listId: number
  onChange?: (name: string, value: any) => void
  cyclic?: boolean
  cycleInterval?: number
}

type OnMessage = (varId: number, value: Buffer) => void

type ListenerList = { listId: Number; cb: OnMessage }[]

export const client = (endpoint: string = '255.255.255.255', port: number = 1202) => {
  const listeners: ListenerList = []

  const socket = createSocket('udp4', (msg) => {
    if (msg.length < 20) {
      return
    }
    const data = msg.toString('hex')
    const varId = parseInt(data.substr(18, 4), 16)
    const listId = parseInt(data.substr(16, 2), 16)
    listeners.filter((l) => l.listId == listId).forEach((l) => l.cb(varId, msg.subarray(20)))
  })

  socket.bind(port)

  const mkValue = (def: t.Types): { data: string; lng: number } => {
    const out = Buffer.alloc(250)
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

  type Return<T extends { [key: string]: t.Types }> = {
    set: <K extends keyof T>(name: K, value: T[K]['value']) => boolean
    setMore: (set: { [K in keyof T]?: T[K]['value'] }) => boolean
    get: <K extends keyof T>(name: K) => T[K]['value'] | undefined
    definition: string
    dispose: () => void
  }

  const list = <T extends { [k: string]: t.Types }>(options: Options, vars: T): Return<T> => {
    const { listId, onChange, cyclic, cycleInterval } = options
    const nodeId = '002d5333'

    let sortedIdx = Object.entries(vars).sort((a, b) => a[1].idx - b[1].idx)

    let state = { ...vars }
    let cycleIntervalTimer: NodeJS.Timeout | undefined = undefined
    if (cyclic) {
      const interval = cycleInterval || 1000
      cycleIntervalTimer = setInterval(() => send(state), interval)
    }

    const getVarName = (idx: number): keyof T | undefined => {
      return Object.entries(vars)
        .filter(([, v]) => v.idx === idx)
        .map(([key]) => key)
        .shift()
    }

    const getNextSendCounter: Record<keyof T, number> = Object.keys(state).reduce(
      (acc, n) => ({ ...acc, [n]: -1 }),
      {} as Record<keyof T, number>,
    )

    const getCounter = (key: keyof T) => {
      getNextSendCounter[key]++
      const nrText = ('0000000' + getNextSendCounter[key].toString(16)).substr(-8)

      return nrText.substr(6, 2) + nrText.substr(4, 2) + nrText.substr(2, 2) + nrText.substr(0, 2)
    }
    const send = (send: Partial<T>) => {
      Object.entries(send)
        .filter((toSend): toSend is [string, t.Types] => true)
        .map(([name, toSend]) => {
          const { data, lng } = mkValue(toSend)
          return {
            idx: toSend.idx.toString(16),
            counter: getCounter(name),
            // @ts-ignore
            data,
            lng: mkLng(lng),
          }
        })
        .map(({ idx, lng, counter, data }) =>
          Buffer.from(`${nodeId}000000000${listId}000${idx}000100${lng}${counter}${data}`, 'hex'),
        )
        // .map((a) => {
        //   console.log(a.toString('hex'))
        //   return a
        // })
        .forEach((cmd) => socket.send(cmd, 1202, endpoint))
    }

    const readIntoVar = (varName: string, data: Buffer, offset: number): number => {
      let bytesRead = 0

      const selVar = state[varName]
      const oldValue = selVar.value
      switch (selVar.type) {
        case 'BOOL':
          selVar.value = data.readInt8(offset) !== 0
          bytesRead = 1
          break
        case 'BYTE':
          selVar.value = data.readInt8(offset)
          bytesRead = 1
          break
        case 'WORD':
          selVar.value = data.readInt16LE(offset)
          bytesRead = 2
          break
        case 'DWORD':
          selVar.value = data.readInt32LE(offset)
          bytesRead = 4
          break
        case 'STRING': {
          let strdata = data.slice(offset)
          let length = strdata.findIndex((c) => c === 0)
          selVar.value = strdata.toString('ascii', offset, length === -1 ? undefined : length)
          bytesRead = length === -1 ? 0 : length
          break
        }
        case 'WSTRING': {
          let strdata = data.slice(offset)
          let length = strdata.findIndex((c) => c === 0)
          selVar.value = strdata.toString('utf16le', offset, length === -1 ? undefined : length)
          bytesRead = length === -1 ? 0 : length
          break
        }
        case 'TIME':
          selVar.value = data.readInt32LE(offset)
          bytesRead = 4
          break
        case 'REAL':
          selVar.value = data.readFloatLE(offset)
          bytesRead = 4
          break
        case 'LREAL':
          selVar.value = data.readDoubleLE(offset)
          bytesRead = 8
          break
        default: {
          //selVar.value = data.readInt8()
        }
      }

      if (oldValue !== selVar.value && onChange) {
        onChange(`${varName}`, selVar.value)
      }
      return bytesRead
    }

    const onMessage = (varId: number, data: Buffer) => {

      if (varId === 0) { // no SubIndex, iterate packed variables 
        const slice = data
        let offset = 0
        sortedIdx.forEach(o => {
          let varName = o[0]
          if (varName) {
            offset += readIntoVar(varName, data, offset)
          }
        })

      } else {
        const varName = getVarName(varId)
        if (typeof varName === 'string') {
          readIntoVar(varName, data, 0)
        }
      }
      const varName = getVarName(varId)

    }
    listeners.push({ listId, cb: onMessage })

    const definition = `<GVL>
  <Declarations><![CDATA[VAR_GLOBAL
${Object.entries(state)
        .sort((a, b) => a[1].idx - b[1].idx)
        .map(([name, def]) => `        ${name}: ${def.type};`)
        .join('\n')}
END_VAR]]></Declarations>
  <NetvarSettings Protocol="UDP">
    <ListIdentifier>${listId}</ListIdentifier>
    <Pack>False</Pack>
    <Checksum>False</Checksum>
    <Acknowledge>False</Acknowledge>
    <CyclicTransmission>${options.cyclic ? 'True' : 'False'}</CyclicTransmission>
    <TransmissionOnChange>True</TransmissionOnChange>
    <TransmissionOnEvent>False</TransmissionOnEvent>
    <Interval>T#${options.cycleInterval || 9000000}ms</Interval>
    <MinGap>T#1ms</MinGap>
    <EventVariable>
    </EventVariable>
    <ProtocolSettings>
      <ProtocolSetting Name="Broadcast Adr." Value="${endpoint}"/>
      <ProtocolSetting Name="Port" Value="${port}"/>
    </ProtocolSettings>
  </NetvarSettings>
</GVL>`

    return {
      set: (name, value): boolean => {
        if (name in state) {
          state[name].value = value
          send({ [name]: state[name] } as any)
          return true
        }
        return false
      },
      setMore: (set): boolean => {
        try {
          state = Object.entries(set).reduce(
            (acc, [name, value]) => ({ ...acc, [name]: { ...acc[name], value } }),
            state,
          )
          const newSet = Object.entries(set).reduce(
            (acc, [name, value]) => ({
              ...acc,
              [name]: { ...state[name], value },
            }),
            {},
          )
          send(newSet)
          return true
        } catch {
          return false
        }
      },
      get: (name) => name in state ? state[name].value : undefined,
      definition,
      dispose: () => cycleIntervalTimer && clearInterval(cycleIntervalTimer),
    }
  }

  return {
    openList: list,
  }
}
