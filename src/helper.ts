import { t } from './index'

const identity = '\x00-S3';

interface AnalysisResult {
  isValid: boolean;
  errors: string[];
  header: { [key: string]: any };
  parsedData: { [key: string]: any };
}

export function analyzeDataString(hexString: string, sortedIdx: string[], vars: { [key: string]: t.Types }): AnalysisResult {
  let result: AnalysisResult = {
    isValid: true,
    errors: [],
    header: {},
    parsedData: {}
  };

  // 1. Parse and verify the header fields
  const buffer = Buffer.from(hexString, 'hex');

  result.header = {
    identity: buffer.toString('ascii', 0, 4),
    ID: buffer.readUInt32LE(4),
    index: buffer.readUInt16LE(8),
    subIndex: buffer.readUInt16LE(10),
    items: buffer.readUInt16LE(12),
    length: buffer.readUInt16LE(14),
    counter: buffer.readUInt16LE(16),
    flags: buffer.readUInt8(18),
    checksum: buffer.readUInt8(19)
  };

  const length = result.header['length'];

  if (result.header['identity'] !== identity) {
    result.isValid = false;
    result.errors.push(`Invalid identity code. Expected: ${identity.toString()}, got '${result.header['identity'].toString()}'`);
  }

  // Additional header checks can be added here

  // 2. Check the message length for correctness
  const msgLen = hexString.length / 2;
  if (msgLen !== length) {
    result.isValid = false;
    result.errors.push(`Incorrect message length. header says ${length}, but message size is ${msgLen}`);
  }

  // 3. Parse and validate the data fields
  let dataStart = 20; // Starting index of data

  sortedIdx.forEach((key: string) => {
    const varType = vars[key].type;
    let dataLength: number;

    switch (varType) {
      case 'BOOL':
      case 'BYTE':
        dataLength = 1;
        result.parsedData[key] = buffer.readUInt8(dataStart);
        break;
      case 'WORD':
        dataLength = 2;
        result.parsedData[key] = buffer.readUInt16LE(dataStart);
        break;
      case 'DWORD':
      case 'TIME':
      case 'REAL':
        dataLength = 4;
        result.parsedData[key] = buffer.readUInt32LE(dataStart);
        break;
      case 'LREAL':
        dataLength = 8;
        result.parsedData[key] = buffer.readDoubleLE(dataStart);
        break;
      case 'STRING':
      case 'WSTRING':
        // Find the null terminator to determine the string length
        const nullIndex = buffer.indexOf(0, dataStart);
        dataLength = nullIndex - dataStart;
        const encoding = varType === 'STRING' ? 'ascii' : 'utf16le';
        result.parsedData[key] = buffer.toString(encoding, dataStart, nullIndex);
        break;
      default:
        dataLength = 0;
    }

    dataStart += dataLength;
  });

  // Check if the data parsing exceeds the message length
  if (dataStart > length) {
    result.isValid = false;
    result.errors.push("Data parsing exceeds message length.");
  }

  return result;
}

