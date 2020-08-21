import { client } from './index'
import * as t from './types'

const netVar = client('192.168.0.100')

const list1 = netVar.openList(
  { listId: 1, onChange: console.log },
  {
    emergency: t.boolean(2),
    working: t.word(3),
    counter: t.dWore(4, 1425),
  },
)

list1.set('emergency', true)
list1.setMore({ emergency: true, working: 1 })
console.log(list1.get('emergency'))
console.log(list1.get('working'))
console.log(list1.get('counter'))

// const list3 = netVar.openList(3, console.log, t.nvBoolean(0, "enabled", true));

// process.stdin.on("data", (msg) => {
//   const i = msg.toString().trim();
//   switch (i) {
//     case "1":
//       list3.setValue("enabled", true);
//       break;
//     case "2":
//       list3.setValue("enabled", false);
//       break;
//     case "r1":
//       console.log(list3.getValue("enabled"));
//       break;
//     case "r2":
//       console.log(list1.getValue("emergency"));
//       break;
//     case "r3":
//       console.log(list1.getValue("working"));
//       break;
//   }
// });

// 000000010000000001000000010015003e00000001
//

// 0          1           2            3          4
// 01234567 89012345 67 8901 23 45 67890123 45678901
// 002d5333 00000000 01 0002 00 01 0015002a 00000001
// 002d5333 00000000 01 0005 00 01 00150009 00000000
// 0 Task_DONE
// 1 Enabled
// 2 Active
// 3 Task_queued
// 4 More_Task
// 5 Emergency
// 6 On_Off
// 7 Working

// startup :
// 002d53330000000001000000010015000100000000
// 002d53330000000001000100010015000100000001
// 002d53330000000001000200010015000100000000
// 002d53330000000001000300010015000100000000
// 002d53330000000001000400010015000100000000
// 002d53330000000001000500010015000100000000
// 002d53330000000001000600010015000100000000
// 002d53330000000001000700010015000100000000
//const outPut = new Socket({ captureRejections: true })

// id  002d5333
// nul         00000000
// list Id             0100
// VAR idx                 0600
// varCount                    0100
// nr of bytes over all            1500
// counter                             28000000
// data                                        DATA
// const dataArray = []
