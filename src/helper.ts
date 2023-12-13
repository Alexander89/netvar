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

  var dataStart = 20; // Starting index of data
  // 1. Parse and verify the header fields
  const buffer = Buffer.from(hexString, 'hex');

  if (buffer.length < dataStart) {
    result.isValid = false;
    result.errors.push("Message shorter than headersize");
    return result;
  }

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
      case 'STRING': {
        const nullIndex = buffer.indexOf(0, dataStart); // Find the first occurrence of 0 from the offset
        if (nullIndex === -1) {
          dataLength = 0;
          result.errors.push(`No string termination found for ${key}`);
        } else {
          result.parsedData[key] = buffer.toString('ascii', dataStart, nullIndex);
          dataLength = nullIndex - dataStart + 1;
        }
        break;
      }
      case 'WSTRING': {
        let nullIndex = -1;
        for (let i = dataStart; i < buffer.length - 1; i += 2) {
          if (buffer[i] === 0 && buffer[i + 1] === 0) {
            nullIndex = i;
            break;
          }
        }
        if (nullIndex !== -1) {
          result.parsedData[key] = buffer.toString('utf16le', dataStart, nullIndex);
          dataLength = nullIndex - dataStart + 2; // +2 to include the two null bytes
        } else {
          dataLength = 0;
          result.errors.push(`No string termination found for ${key}`);
        }
        break;
      }
      default:
        dataLength = 0;
        result.errors.push(`Unknown data type ${varType}`);
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

