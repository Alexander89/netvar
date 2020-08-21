# CoDeSys NetworkVariableLists

**_BETA: Unpacked BOOL variables only_**

to exchange Global variables CoDeSys PLCs is very easy. Just create a NetworkVariableList and add the variables to it. With this package you can receive this UDP packages and interpret them and set them, when you setup a NVL (receiver)

## How it works

The package is type-save and will hint you on your inputs. You can use it in JavaScript as well, but make sure that you do not mess up the variable names.

### client connect

Create a new client from the `netvar` package

```typescript
import { client } from "netvar";

const netVar = client();
// or const netVar = client(1202, "192.168.0.255");
```

### Connect to list

And attach the client to a list, defined in your PLC

**_Note:_** If you add a cnChange callback you get **all** updates to this list live from the network.

```typescript
const list1 = netVar.openList({
  listId: 1,
  vars: {
    emergency: false,
    working: false,
  },
  varMap: {
    0: "working",
    1: "emergency",
  },
});

// more lists
const list2 = netVar.openList({
  listId: 2,
  vars: { enable: false },
  varMap: { 0: "enable" },
  onChange: (name, value) => console.log(name, value),
});
```

### Get value

Read value from the list. This value will be your initial values till you change them or you get some information from a other client

```typescript
const value = list1.getValue("working");
console.log(value);
```

### Set value

Set value to the list and send it to the PLC / other listeners

```typescript
list1.setValue("working", false);
```
