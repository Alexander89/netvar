import { createSocket } from 'dgram'
import { d2h, msgStr, packedMsgStr } from './util'
import * as t from './types'

export * as t from './types'

export type Options = {
  listId: number
  // todo change to unknown
  onChange?: (name: string, value: any) => void // eslint-disable-line
  cyclic?: boolean
  cycleInterval?: number
  packed?: boolean
}

interface ClientOptions {
  /// Port to listen to
  port?: number
  /// Optional port to use when sending data
  /// (if not specified, `port` is used to send data as well)
  send_port?: number
  /// If true, sent and received packages are printed to the terminal
  debug?: boolean
}

type OnMessage = (varId: number, value: Buffer) => void

type ListenerList = { listId: number; cb: OnMessage }[]

/// endpoint: default value '255.255.255.255'
export const client = (endpoint: string = '255.255.255.255', clientopts?: ClientOptions) => {
  const listeners: ListenerList = []

  const port = clientopts?.port || 1202
  const write_port = clientopts?.send_port || port
  const debug = clientopts?.debug || false

  const socket = createSocket('udp4', (msg) => {
    if (msg.length < 20) {
      return
    }

    const listId = msg.readUInt16LE(8);
    const varId = msg.readUInt16LE(10);

    if (debug) {
      const data = msg.toString('hex')
      console.log(`RECV (listId: ${listId}, from ${endpoint}:${write_port}): ${data}`)
    }
    listeners.filter((l) => l.listId == listId).forEach((l) => l.cb(varId, msg.subarray(20)))
  })

  socket.bind(port, () => {
    if (debug) {
      const recvBufferSize = socket.getRecvBufferSize();
      const sendBufferSize = socket.getSendBufferSize();

      console.log(`Socket is bound to port ${port}`);
      console.log(`Receive Buffer Size: ${recvBufferSize}`);
      console.log(`Send Buffer Size: ${sendBufferSize}`);
    }
  });

  type Return<T extends { [key: string]: t.Types }> = {
    set: <K extends keyof T>(name: K, value: T[K]['value']) => boolean
    setMore: (set: { [K in keyof T]?: T[K]['value'] }) => boolean
    get: <K extends keyof T>(name: K) => T[K]['value'] | undefined
    definition: string
    dispose: () => void
  }

  const list = <T extends { [k: string]: t.Types }>(options: Options, vars: T): Return<T> => {
    const { listId, onChange, cyclic, cycleInterval, packed } = options
    const nodeId = '002d5333'
    const listIdStr = d2h(listId, 4)

    let packedSendCounter = 0

    const write_state: T = JSON.parse(JSON.stringify(vars)) //clone to save write state separately
    const sortedIdx = Object.entries(write_state)
      .sort((a, b) => a[1].idx - b[1].idx)
      .map(([name, _]) => name)

    let state = { ...vars }

    let cycleIntervalTimer: NodeJS.Timeout | undefined = undefined
    if (cyclic) {
      const interval = cycleInterval || 1000
      cycleIntervalTimer = setInterval(
        () => (packed ? sendPacked(write_state) : send(write_state)),
        interval,
      )
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
      return getNextSendCounter[key]++
    }

    const getPackedSendCounter = (): number => {
      packedSendCounter += 1
      if (packedSendCounter > 65535) packedSendCounter = 0
      return packedSendCounter
    }

    const sendPacked = (write_state: T) => {
      const cmdStr = packedMsgStr(listIdStr, getPackedSendCounter(), sortedIdx, write_state);
      const cmd = Buffer.from(cmdStr, 'hex')

      if (debug) {
        console.log(`SEND (${endpoint}:${write_port}): ${cmdStr}`)
      }
      socket.send(cmd, write_port, endpoint)
    }

    const send = (send: Partial<T>) => {
      msgStr(getCounter, send)
        .map(({ idx, lng, counter, data }) => {
          const str = `${nodeId}00000000${listIdStr}${idx}0100${lng}${counter}0000${data}`
          if (debug) {
            console.log(`SEND (${endpoint}:${write_port}): ${str}`)
          }
          return Buffer.from(str, 'hex')
        })
        .forEach((cmd) => {
          socket.send(cmd, write_port, endpoint)
        })
    }

    const readIntoVar = (varName: string, data: Buffer, offset: number): number => {
      let bytesRead = 0

      //TODO - maybe improve error handling at some point
      try {
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
            const strdata = data.slice(offset)
            const length = strdata.findIndex((c) => c === 0)
            selVar.value = strdata.toString('ascii', offset, length === -1 ? undefined : length)
            bytesRead = length === -1 ? 0 : length
            break
          }
          case 'WSTRING': {
            const strdata = data.slice(offset)
            const length = strdata.findIndex((c) => c === 0)
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
      } catch { }
      return bytesRead
    }

    const onMessage = (varId: number, data: Buffer) => {
      if (varId === 0) {
        let offset = 0
        sortedIdx.forEach((name) => {
          if (name) {
            offset += readIntoVar(name, data, offset)
          }
        })
      } else {
        const varName = getVarName(varId)
        if (typeof varName === 'string') {
          readIntoVar(varName, data, 0)
        }
      }
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
          write_state[name].value = value
          packed
            ? sendPacked(write_state)
            : send({ [name]: write_state[name] } as any as Partial<T>) // eslint-disable-line
          return true
        }
        return false
      },
      setMore: (set): boolean => {
        try {
          Object.keys(set).forEach(name => {
            const key = name as keyof T;
            const newValue = set[key];

            // Check if newValue is not undefined before assigning
            if (key in state && newValue !== undefined) {
              write_state[key].value = newValue;
            }
          });

          if (packed) {
            sendPacked(write_state);
          } else {
            const newSet: Partial<T> = {};
            Object.keys(set).forEach(name => {
              const key = name as keyof T;
              const newValue = set[key];

              // Include in newSet only if newValue is not undefined
              if (key in state && newValue !== undefined) {
                newSet[key] = { ...state[key], value: newValue };
              }
            });
            send(newSet);
          }
          return true;
        } catch {
          return false;
        }
      },
      get: (name) => (name in state ? state[name].value : undefined),
      definition,
      dispose: () => {
        cycleIntervalTimer && clearInterval(cycleIntervalTimer)
        socket.close()
      },
    }
  }

  return {
    openList: list,
  }
}
