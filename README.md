# Changes to original package by alexander98
- openList supports an additional boolean `packed`. Needed if the PLC has `pack variables` activated. In this mode, a set(), setMore() or cyclic send will always send all variables in one packed message, instead of sending each variable in an individual UDP packet. Also receive detects if message is packed and handles it correctly
- send port not hardcoded to 1202, can be defined as an optional parameter in client().
- debug: log sent and received messages
- UDP message parts are encoded properly so listId can be larger than 0xF and the message counters increment correctly
# CoDeSys NetworkVariableLists

To exchange global variables with a CoDeSys-PLC is very easy. Just create a NetworkVariableList _(NVL (Sender))_ and add your variables to the list. With this package you can receive this UDP-packages and parse them.

To send data to a CoDeSys-PLC, you define a new list with this node-module and use the generated `definition` to define the network variable list in your PLC as NVL (receiver).

## How to do

The package is type-save and will hint you on your inputs. You can use it in Typescript and JavaScript. Please be careful with the types when you use it with JavaScript.

### Create a new client

Create a new client with the `netvar` package

```typescript
import { client } from 'netvar'

const netVar = client()
const netVar1 = client('192.168.0.123') //defaults to port 1202
const netVar2 = client('192.168.0.255', {port: 1202}) //uses the same port for send and receive
const netVar3 = client('192.168.0.123', {port: 1202, send_port: 1302}) //receive from port 1202, send to port 1302
const netVar4 = client('192.168.0.123', {debug: true}) //enable debug messages
```

### Define a new or connect to existing list

Define a new variable list or enter the definition of an existing network variable list. The names do not matter for the communication and can be adjusted to your naming conventions.

**_Note:_** If you add a `onChange` callback you get **all** updates on this list live from the network.

```typescript
const list1 = netVar.openList(
  { listId: 1 },
  {
    emergency: t.boolean(0),
    working: t.word(1),
    counter: t.dWord(2, 4242),
  },
)

// more lists
const list2 = netVar.openList({
  {
    listId: 2,
    onChange: (name, value) => console.log(name, value),
    cyclic: true,
    cycleInterval: 2000,
    packed: true, //pack all variables on send (when set() or setMore()). Some PLCs only support this mode
  },
  {
    Active: t.boolean(0),
    Next_Task: t.string(1, 'nut'),
    Speed: t.real(2, Math.PI),
  },
)
```

### Get value

Read the value of a property from the list.

This value will be your initial values until you change it or you get different information over the network.

```typescript
const value = list1.get('working')
console.log(value)
```

### Set value

Set a one new value to a specific property from the list or set a number of new values.

The new values are send to the other peers (PLC).

```typescript
list1.set('working', false)
list1.setMore({
  working: false,
  counter: 42,
})
```

### Get Definition

Build the Definition to set the network variable list configuration on a PLC (receiver)

```typescript
import fs from 'fs'
fs.writeFileSync('definiting.gvl', list1.definition)
```

---

## Available data types

| Type      | Node    | PLC     |
| --------- | ------- | ------- |
| t.boolean | boolean | BOOLEAN |
| t.word    | number  | WORD    |
| t.string  | string  | STRING  |
| t.wString | string  | WSTRING |
| t.byte    | number  | BYTE    |
| t.dWord   | number  | DWORD   |
| t.time    | number  | TIME    |
| t.real    | number  | REAL    |
| t.lReal   | number  | LREAL   |

Example:

```typescript
import { t } from 'netvar'
const vars = {
  test: t.real(1, Math.PI),
}
```
