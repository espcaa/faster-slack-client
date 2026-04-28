const BOILERPLATE_HEX =
  "ffd8ffdb0084003525282f2821352f2b2f3c39353f50855750494950a3757b6185c1aacb" +
  "c8beaabab7d5f0ffffd5e2ffe6b7baffffffffffffffffffceffffffffffffffffffff01" +
  "393c3c5046509d57579dffdcbadcffffffffffffffffffffffffffffffffffffffffffff" +
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc0001108002000300301" +
  "22" +
  "00021101031101ffc401a20000010501010101010100000000000000000102030405060708" +
  "090a0b100002010303020403050504040000017d01020300041105122131410613516107" +
  "227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435" +
  "363738393a434445464748494a535455565758595a636465666768696a73747576777879" +
  "7a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9ba" +
  "c2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8" +
  "f9fa0100030101010101010101010000000000000102030405060708090a0b1100020102" +
  "040403040705040400010277000102031104052131061241510761711322328108144291" +
  "a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a4344" +
  "45464748494a535455565758595a636465666768696a737475767778797a828384858687" +
  "88898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7" +
  "c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c0301" +
  "0002110311003f00";

const SOF0_DIMS_OFFSET = (() => {
  const b = hexToBytes(BOILERPLATE_HEX);
  for (let i = 0; i < b.length - 1; i++) {
    if (b[i] === 0xff && b[i + 1] === 0xc0) return i + 5;
  }
  throw new Error("SOF0 not found in boilerplate");
})();

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export interface ThumbTinyResult {
  width: number;
  height: number;
  bytes: Uint8Array;
  dataUrl: string;
}

export function decodeThumbTiny(thumbTiny: string): ThumbTinyResult {
  const raw = base64ToBytes(thumbTiny);
  if (raw.length < 6) throw new Error("thumb_tiny too short");

  const components = raw[0];
  const height = (raw[1] << 8) | raw[2];
  const width = (raw[3] << 8) | raw[4];
  if (components !== 0x03) {
    throw new Error(`unexpected component count ${components}`);
  }

  const header = hexToBytes(BOILERPLATE_HEX);

  header.set(raw.subarray(1, 5), SOF0_DIMS_OFFSET);

  const scan = raw.subarray(5);
  const out = new Uint8Array(header.length + scan.length);
  out.set(header, 0);
  out.set(scan, header.length);

  return {
    width,
    height,
    bytes: out,
    dataUrl: "data:image/jpeg;base64," + bytesToBase64(out),
  };
}
