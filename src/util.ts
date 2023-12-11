const bitnot = (bn: bigint) => {
  bn = BigInt(-bn)
  let bin = bn.toString(2)
  let prefix = ''
  while (bin.length % 8) {
    bin = '0' + bin
  }
  if ('1' === bin[0] && -1 !== bin.slice(1).indexOf('1')) {
    prefix = '11111111'
  }
  bin = bin
    .split('')
    .map(function(i) {
      return '0' === i ? '1' : '0'
    })
    .join('')
  return BigInt('0b' + prefix + bin) + BigInt(1)
}

export const d2h = (d: number, l: number) => {
  let bn = BigInt(d);

  let pos = true;
  if (bn < 0) {
    pos = false;
    bn = bitnot(bn); // Assume bitnot correctly handles bitwise NOT operation
  }

  let hex = bn.toString(16);
  if (pos) {
    // For positive numbers, pad with '0' at the start
    hex = hex.padStart(l, '0').substring(0, l);
  } else {
    // For negative numbers, pad or truncate with 'f' at the start
    hex = hex.padStart(l, 'f').substring(0, l);
  }

  return hex;
};
