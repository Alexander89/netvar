# CoDeSys NetworkVariableLists

To exchange Global variables with a CoDeSys PLC is very easy. Just create a NetworkVariableList and add the variables to it. With this package you can receive this UDP network packages and interpret them.

To send Data to the PLC, you can use the definition made from this package and create a NVL (receiver) on the PLC.

## How it works

The package is type-save and will hint you on your inputs. You can use it in Typescript and JavaScript. Please be careful with the types when you use it with JavaScript

### client connect

Create a new client from the `netvar` package

```typescript
import { client } from 'netvar'

const netVar = client()
const netVar1 = client('192.168.0.123')
const netVar2 = client('192.168.0.255', 1202)
```

### Connect to list

And attach the client to a list, defined in your PLC

**_Note:_** If you add a cnChange callback you get **all** updates to this list live from the network.

```typescript
const list1 = netVar.openList(
  { listId: 1 },
  {
    emergency: t.boolean(1),
    working: t.word(2),
    counter: t.dWore(3, 1425),
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
    Speed: t.float(2, 0.15625),
  },
)
```

### Get value

Read value from the list. This value will be your initial values till you change them or you get some information from a other client

```typescript
const value = list1.getValue('working')
console.log(value)
```

### Set value

Set value to the list and send it to the PLC / other listeners

```typescript
list1.setValue('working', false)
```

### Get Definition

To set the peer configuration in the PLC export the list definition

```typescript
import fs from 'fs'
fs.writeFileSync('definiting.gvl', list1.definition)
```
