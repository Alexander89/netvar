import { client, t } from './index'
import fs from 'fs'
import { d2h } from './util';
import dgram from 'dgram';

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
    expect(d2h(127, 4)).toBe('007f'); // 127 in hex is 7f
  });

  test('positive number at 16-bit boundary', () => {
    expect(d2h(32767, 6)).toBe('007fff'); // 32767 in hex is 7fff
  });

  test('negative number within range', () => {
    expect(d2h(-128, 4)).toBe('ff80'); // -128 in hex is ff80
  });

  test('negative number at 16-bit boundary', () => {
    expect(d2h(-32768, 6)).toBe('ff8000'); // -32768 in hex is 8000 with sign bit
  });

  test('length compliance - larger length', () => {
    expect(d2h(100, 6)).toHaveLength(6); // Testing length compliance
  });

  test('length compliance - smaller length', () => {
    expect(d2h(1000, 2)).toHaveLength(2); // Testing truncation to smaller length
  });

  test('edge case - high bit set in positive number', () => {
    expect(d2h(128, 4)).toBe('0080'); // 128 in hex is 80; check for correct handling of high bit
  });

  // Add more tests as needed for thorough coverage
});
