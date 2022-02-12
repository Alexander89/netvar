import { client, t } from './index'
import fs from 'fs'
import { createSocket } from 'dgram'

const netVar = client('192.168.0.100')

const list1 = netVar.openList(
  { listId: 1, onChange: console.log },
  {
    emergency: t.boolean(1),
    working: t.word(2),
    counter: t.dWore(3, 1425),
    text: t.string(4, 'Hello PLC'),
    wText: t.wString(5, 'Hello い'),
  },
)

list1.set('emergency', true)
list1.setMore({ emergency: true, working: 1, text: 'Hello PLC newText' })
console.log(list1.get('emergency'))
console.log(list1.get('working'))
console.log(list1.get('counter'))
console.log(list1.get('text'))
console.log(list1.get('wText'))
list1.set('emergency', true)
list1.set('wText', 'hello this is a utf16LE text')
list1.set('text', 'hello this is a ascii code')
console.log(list1.get('text'))
console.log(list1.get('wText'))

fs.writeFileSync('definiting.gvl', list1.definition)

// const b = Buffer.from([0x00, 0x2d, 0x53, 0x33, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x05, 0x00, 0x01, 0x00, 0x17, 0x00, 0x3e, 0x00, 0x00, 0x00, 0x41, 0x42, 0x41, 0x42, 0x00, 0x00])
// createSocket('udp4', (input) => {}).send(b, 1202, 'localhost')

// 0          1           2            3           4
// 01234567 89012345 6789 0123 4567 8901 23456789 01
// 002d5333 00000000 0100 0200 0100 1500 2a000000 01
// 002d5333 00000000 0100 0500 0100 1500 09000000 00
// 0 Task_DONE
// 1 Enabled

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

//TODO
function test_packed() {
const b = Buffer.from([0x00, 0x2d, 0x53, 0x33, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x04, 0x00, 0x24, 0x00, 0x6d, 0xd8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3f, 0x4b, 0x8e, 0x00])
}