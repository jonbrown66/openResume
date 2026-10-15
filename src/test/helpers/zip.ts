import { inflateRawSync } from 'node:zlib';
/** Read one ZIP entry using its central directory, including archives with data descriptors. */
export function readZipText(buffer: Buffer, name: string): string {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Invalid ZIP');
  let offset = buffer.readUInt32LE(end + 16);
  while (offset < end && buffer.readUInt32LE(offset) === 0x02014b50) {
    const length = buffer.readUInt16LE(offset + 28); const extra = buffer.readUInt16LE(offset + 30); const comment = buffer.readUInt16LE(offset + 32);
    if (buffer.subarray(offset + 46, offset + 46 + length).toString() === name) {
      const local = buffer.readUInt32LE(offset + 42);
      const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
      const data = buffer.subarray(start, start + buffer.readUInt32LE(offset + 20));
      return (buffer.readUInt16LE(offset + 10) === 8 ? inflateRawSync(data) : data).toString();
    }
    offset += 46 + length + extra + comment;
  }
  throw new Error(`Missing ZIP entry: ${name}`);
}
