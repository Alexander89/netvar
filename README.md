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
const netVar1 = client('192.168.0.123')
const netVar2 = client('192.168.0.255', 1202)
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
    counter: t.dWore(2, 4242),
  },
)

// more lists
const list2 = netVar.openList({
  {
    listId: 2,
    onChange: (name, value) => console.log(name, value),
    cyclic: true,
    cycleInterval: 2000,
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
| t.wString | string  | STRING  |
| t.byte    | number  | BYTE    |
| t.dWore   | number  | DWORE   |
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
