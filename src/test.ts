import { client, t } from './index'
import { d2h, packedMsgStr } from './util';
import dgram from 'dgram';
import { analyzeDataString } from './helper';

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
}));

describe('netVar client tests', () => {
  let netVar, list1: any, server: dgram.Socket
  const ENDPOINT = 'localhost';
  const SERVER_PORT = 1302;
  const CLIENT_PORT = 1202;

  type Callback = (value: any) => void;
  let varMap: Map<string, Callback> = new Map();

  beforeAll(done => {
    // Set up the UDP echo server
    server = dgram.createSocket('udp4');

    server.on('error', (err) => {
      console.error(`Server error:\n${err.stack}`);
      server.close();
    });

    server.on('message', (msg, rinfo) => {
      server.send(msg, rinfo.port, ENDPOINT, (error, _bytes) => {
        if (error) {
          console.error(`Server error:\n${error}`);
        } else {
        }
      });
    });

    server.bind(SERVER_PORT, () => {
      // Set up your client after the server is ready
      netVar = client(ENDPOINT, { port: CLIENT_PORT, send_port: SERVER_PORT, debug: false }); // Use localhost and the same port
      list1 = netVar.openList(
        {
          listId: 0, onChange: (name: string, value: any) => {
            const callback = varMap.get(name);
            if (callback) {
              //console.log(`Received ${name} = "${value}"`);
              callback(value);
            }
            else {
              //console.log(`Received ${name} = "${value}" NO CALLBACK`);
            }
          }, packed: true
        },
        {
          emergency: t.boolean(1),
          working: t.word(2),
          counter: t.dWord(3, 1425),
          text: t.string(4, 'Hello PLC'),
          wText: t.wString(5, 'Hello い'),
        },
      );
      done(); // Indicate Jest that the setup is complete
    });
  });

  afterAll(() => {
    list1.dispose();
    server.close();
  });

  type VariableExpectation = {
    name: string;
    expectedValue: any;
  };

  function testVariableChanges(expectations: VariableExpectation[], triggerChange?: () => void, timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout: Not all variable changes received within ${timeout}ms`));
      }, timeout);

      let remainingExpectations = new Set(expectations.map(e => e.name));

      for (const { name, expectedValue } of expectations) {
        varMap.set(name, (value) => {
          try {
            expect(value).toEqual(expectedValue);
            remainingExpectations.delete(name);

            if (remainingExpectations.size === 0) {
              clearTimeout(timeoutId);
              resolve();
            }
          } catch (error) {
            clearTimeout(timeoutId);
            reject(new Error(`Assertion failed for variable '${name}': ${error}`));
          }
        });

        // Trigger the change if a trigger function is provided
      }
      triggerChange?.();
    });
  }

  test('set single value', async () => {
    await testVariableChanges([
      { name: 'emergency', expectedValue: true }
    ],
      () => list1.set('emergency', true)
    );

  });

  test('set single value back', async () => {
    await testVariableChanges([
      { name: 'emergency', expectedValue: false }],
      () => list1.set('emergency', false)
    );
  });

  test('set multiple values', async () => {
    await testVariableChanges([
      { name: 'emergency', expectedValue: true },
      { name: 'working', expectedValue: 1 }
    ],
      () => {
        list1.set('emergency', true);
        list1.set('working', 1);
      });
  });

  test('set multiple values2', async () => {
    await testVariableChanges([
      { name: 'emergency', expectedValue: false },
      { name: 'working', expectedValue: 2 }
    ],
      () => list1.setMore({ emergency: false, working: 2 }));
  });
});


describe('test packed messages', () => {

  test('packed test 1', () => {

    var vars = {
      Field0: t.word(1, 129),
      Field1: t.byte(2),
      Field2: t.byte(3),
      Field3: t.byte(4),
      Field4: t.byte(5),
      Field5: t.byte(6),
      Field6: t.byte(7),
      Field7: t.byte(8),
      Field8: t.byte(9),
      Field9: t.byte(10),
      Field10: t.byte(11),
      Field11: t.byte(12),
      Field12: t.byte(13),
      Field13: t.byte(14),
      Field14: t.byte(15),
      Field15: t.word(16),
      Field16: t.dWord(17),
      Field17: t.dWord(18, 32),
      Field18: t.dWord(19),
      Field19: t.dWord(20),
      Field20: t.dWord(21),
      Field21: t.dWord(22),
      Field22: t.dWord(23),
      Field23: t.dWord(24, 50),
      Field24: t.dWord(25),
      Field25: t.dWord(26),
      Field26: t.word(27),
    };

    const sortedIdx = Object.entries(vars)
      .sort((a, b) => a[1].idx - b[1].idx)
      .map(([name, _]) => name);

    var listIdStr = d2h(1, 4);

    let msg = packedMsgStr(listIdStr, 7204, sortedIdx, vars);
    //              0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
    //              |                 HEADER               |          1                   2         3
    let expected = "002d533300000000010000001b005000241c0000810000000000000000000000000000000000000000002000000000000000000000000000000000000000000000003200000000000000000000000000";

    let expectedData = analyzeDataString(expected, sortedIdx, vars);
    let actualData = analyzeDataString(msg, sortedIdx, vars);

    expect(actualData).toStrictEqual(expectedData);
  });

  test('packed test 2', () => {

    var vars = {
      text: t.string(4, 'abcd'),
      wText: t.wString(5, 'efg い'),
    };

    const sortedIdx = Object.entries(vars)
      .sort((a, b) => a[1].idx - b[1].idx)
      .map(([name, _]) => name);

    var listIdStr = d2h(1, 4);

    let msg = packedMsgStr(listIdStr, 7204, sortedIdx, vars);
    //              0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9
    //              |                 HEADER               |                    1                   2                   3
    let expected = "002d5333000000000100000002002500241c00006162636400650066006700200044300000";

    let expectedData = analyzeDataString(expected, sortedIdx, vars);
    let actualData = analyzeDataString(msg, sortedIdx, vars);

    expect(actualData).toStrictEqual(expectedData);
  });
});

describe('definition tests', () => {
  let netVar: ReturnType<typeof client>;
  let list1: any;

  beforeAll(() => {
    netVar = client('127.0.0.1');
    list1 = netVar.openList(
      { listId: 1, onChange: console.log },
      {
        emergency: t.boolean(1),
        working: t.word(2),
        counter: t.dWord(3, 1425),
        text: t.string(4, 'Hello PLC'),
        wText: t.wString(5, 'Hello い'),
      },
    );
  });

  test('definition is generated correctly', () => {
    const definition = list1.definition;
    expect(definition).toContain('VAR_GLOBAL');
    expect(definition).toContain('END_VAR');

    fs.writeFileSync('definiting.gvl', definition);
    expect(fs.writeFileSync).toHaveBeenCalledWith('definiting.gvl', definition);
  });

  afterAll(() => {
    list1.dispose();
  })
});


describe('d2h function tests', () => {
  test('positive number within range', () => {
    expect(d2h(127, 4)).toBe('7f00'); // 127 in hex is 7f
  });

  test('positive number at 16-bit boundary', () => {
    expect(d2h(32767, 6)).toBe('ff7f00'); // 32767 in hex is 7fff
  });

  test('negative number within range', () => {
    expect(d2h(-128, 4)).toBe('80ff'); // -128 in hex is ff80
  });

  test('negative number at 16-bit boundary', () => {
    expect(d2h(-32768, 6)).toBe('0080ff'); // -32768 in hex is 8000 with sign bit
  });

  test('length compliance - larger length', () => {
    expect(d2h(100, 6)).toHaveLength(6); // Testing length compliance
  });

  test('length compliance - smaller length', () => {
    expect(d2h(1000, 2)).toHaveLength(2); // Testing truncation to smaller length
  });

  test('edge case - high bit set in positive number', () => {
    expect(d2h(128, 4)).toBe('8000'); // 128 in hex is 80; check for correct handling of high bit
  });

  // Add more tests as needed for thorough coverage
});
