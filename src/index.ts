import { createSocket } from 'dgram'
import * as t from './types'

export * as t from './types'

export type Options = {
    listId: number
    onChange?: (name: string, value: any) => void
    cyclic?: boolean
    cycleInterval?: number
    packed?: boolean
}

interface ClientOptions {
    /// Port to listen to
    port?: number,
    /// Optional port to use when sending data
    /// (if not specified, `port` is used to send data as well)
    send_port?: number,
    /// If true, sent and received packages are printed to the terminal
    debug?: boolean
}

type OnMessage = (varId: number, value: Buffer) => void

type ListenerList = { listId: Number; cb: OnMessage }[]

/// endpoint: default value '255.255.255.255'
export const client = (endpoint: string = '255.255.255.255',
    clientopts?: ClientOptions) => {
    const listeners: ListenerList = []

    let port = clientopts && clientopts.port ? clientopts.port : 1202;
    let write_port = clientopts && clientopts.send_port ? clientopts.send_port : port;
    let debug = clientopts && clientopts.debug;

    const socket = createSocket('udp4', (msg) => {
        if (msg.length < 20) {
            return
        }
        const data = msg.toString('hex')
        const varId = parseInt(data.substring(18, 22), 16)
        const listId = parseInt(data.substring(16, 18), 16)

        if (debug) {
            console.log(`RECV (listId: ${listId}, from ${endpoint}:${write_port}): ${data}`);
        }
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

    const d2h = (d: number, l: number) => {
        let bn = BigInt(d);

        var pos = true;
        if (bn < 0) {
            pos = false;
            bn = bitnot(bn);
        }

        var hex = bn.toString(16);
        if (hex.length % 2) { hex = '0' + hex; }

        if (pos && (0x80 & parseInt(hex.slice(0, 2), 16))) {
            hex = '00' + hex;
        }

        return (hex.length % 2 ? '0' + hex : hex).padEnd(l, '0')

    }

    const bitnot = (bn: BigInt) => {
        bn = BigInt(-bn);
        var bin = (bn).toString(2)
        var prefix = '';
        while (bin.length % 8) { bin = '0' + bin; }
        if ('1' === bin[0] && -1 !== bin.slice(1).indexOf('1')) {
            prefix = '11111111';
        }
        bin = bin.split('').map(function (i) {
            return '0' === i ? '1' : '0';
        }).join('');
        return BigInt('0b' + prefix + bin) + BigInt(1);
    }


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
        const listIdStr = d2h(listId, 4);

        let packedSendCounter = 0;

        let write_state: T = JSON.parse(JSON.stringify(vars)); //clone to save write state separately
        let sortedIdx = Object.entries(write_state).sort((a, b) => a[1].idx - b[1].idx).map(([name, _]) => name);

        let state = { ...vars }

        let cycleIntervalTimer: NodeJS.Timeout | undefined = undefined
        if (cyclic) {
            const interval = cycleInterval || 1000
            cycleIntervalTimer = setInterval(() => packed ? sendPacked(write_state) : send(write_state), interval)
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
            packedSendCounter += 1;
            if (packedSendCounter > 65535)
                packedSendCounter = 0;
            return packedSendCounter;
        }

        const sendPacked = (write_state: T) => {
            let counter = d2h(getPackedSendCounter(), 4)
            let vars = sortedIdx.map(name => {
                return mkValue(write_state[name])
            });
            let lng = d2h(vars.reduce((sum, current) => sum + current.lng, 0) + 20, 4); //add 20 bytes for the header
            let data = vars.map((current, _lng) => current.data).join('');
            let items = d2h(vars.length, 4);
            let cmdStr = `${nodeId}00000000${listIdStr}0000${items}${lng}${counter}0000${data}`;
            let cmd = Buffer.from(cmdStr, 'hex');

            if (debug) {
                console.log(`SEND (${endpoint}:${write_port}): ${cmdStr}`);
            }
            socket.send(cmd, write_port, endpoint);
        }

        const send = (send: Partial<T>) => {
            Object.entries(send)
                .filter((toSend): toSend is [string, t.Types] => true)
                .map(([name, toSend]) => {
                    const { data, lng } = mkValue(toSend)
                    return {
                        idx: d2h(toSend.idx, 2),
                        counter: d2h(getCounter(name), 2),
                        // @ts-ignore
                        data,
                        lng: mkLng(lng),
                    }
                })
                .map(({ idx, lng, counter, data }) => {
                    let str = `${nodeId}00000000${listIdStr}${idx}0100${lng}${counter}0000${data}`;
                    if (debug) {
                        console.log(`SEND (${endpoint}:${write_port}): ${str}`);
                    }
                    return Buffer.from(str, 'hex')
                },
                )
                .forEach((cmd) => {
                    socket.send(cmd, write_port, endpoint);
                });
        }

        //maybe TODO
        //detect truncated messages
        const varLength = (varName: string): number => {
            let bytesRead: number;
            const selVar = state[varName]
            switch (selVar.type) {
                case 'BOOL':
                    bytesRead = 1
                    break
                case 'BYTE':
                    bytesRead = 1
                    break
                case 'WORD':
                    bytesRead = 2
                    break
                case 'DWORD':
                    bytesRead = 4
                    break
                case 'STRING':
                    throw "Cannot compute length"
                    break
                case 'WSTRING':
                    throw "Cannot compute length"
                    break;
                case 'TIME':
                    bytesRead = 4
                    break;
                case 'REAL':
                    bytesRead = 4
                    break;
                case 'LREAL':
                    bytesRead = 8
                    break;
                default:
                    throw "Cannot compute length"
            }
            return bytesRead;
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
            }
            catch { }
            return bytesRead
        }

        const onMessage = (varId: number, data: Buffer) => {

            if (varId === 0) { // no SubIndex, iterate packed variables 
                const slice = data
                let offset = 0
                sortedIdx.forEach(name => {
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
                    write_state[name].value = value
                    packed ? sendPacked(write_state) : send({ [name]: write_state[name] } as any)
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
                    packed ? sendPacked(write_state) : send(newSet)
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
