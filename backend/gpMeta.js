/**
 * Guitar Pro file metadata extractor
 * Supports .gp3, .gp4, .gp5, .gpx (GP6 bzip2), .gp/.gpx (GP7 zip)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function readGPString(buf, offset) {
  // GP format: 4-byte int (max/padded length), then 1-byte actual length, then string bytes
  if (offset + 4 > buf.length) return { value: '', next: offset + 4 };
  const paddedLen = buf.readUInt32LE(offset);
  offset += 4;
  if (paddedLen === 0) return { value: '', next: offset };
  if (paddedLen > 10000 || offset + paddedLen > buf.length) return { value: '', next: offset + Math.max(0, paddedLen) };
  // Actual string length is in the first byte of the padded field
  const actualLen = buf.readUInt8(offset);
  offset += 1;
  if (actualLen === 0 || actualLen > paddedLen) {
    return { value: '', next: offset + paddedLen - 1 };
  }
  const value = buf.slice(offset, offset + actualLen).toString('utf8').replace(/\0/g, '').replace(/^\uFEFF+/, '').trim();
  return { value, next: offset + paddedLen - 1 };
}

function parseGP345(buf) {
  try {
    let offset = 31; // Skip version string
    const title = readGPString(buf, offset); offset = title.next;
    const subtitle = readGPString(buf, offset); offset = subtitle.next;
    const artist = readGPString(buf, offset); offset = artist.next;
    const album = readGPString(buf, offset);
    return { title: title.value || '', artist: artist.value || '', album: album.value || '' };
  } catch (e) { return null; }
}

function extractXmlMeta(xml) {
  const titleMatch = xml.match(/<Title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/Title>/);
  const artistMatch = xml.match(/<Artist>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/Artist>/);
  const albumMatch = xml.match(/<Album>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/Album>/);
  return {
    title: titleMatch ? titleMatch[1].replace(/^\uFEFF+/, '').trim() : '',
    artist: artistMatch ? artistMatch[1].replace(/^\uFEFF+/, '').trim() : '',
    album: albumMatch ? albumMatch[1].replace(/^\uFEFF+/, '').trim() : '',
  };
}

function parseZipGP(buf) {
  // Scan for zip local file headers
  let offset = 0;
  while (offset < buf.length - 30) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) { offset++; continue; }

    const compression = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const filenameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const filename = buf.slice(offset + 30, offset + 30 + filenameLen).toString('utf8');
    const dataStart = offset + 30 + filenameLen + extraLen;

    if (filename === 'score.gpif' || filename === 'Content/score.gpif') {
      try {
        let xmlData;
        if (compression === 0) {
          // Stored uncompressed
          const size = compressedSize || (buf.length - dataStart);
          xmlData = buf.slice(dataStart, dataStart + size).toString('utf8');
        } else if (compression === 8) {
          // Deflated - try inflating up to 500KB regardless of stated size
          const chunk = buf.slice(dataStart, Math.min(dataStart + 500000, buf.length));
          xmlData = zlib.inflateRawSync(chunk).toString('utf8');
        }
        if (xmlData && xmlData.includes('<GPIF>')) {
          return extractXmlMeta(xmlData);
        }
      } catch (e) {}
    }

    // Advance: if compressedSize is 0 (streaming), scan for next PK header
    if (compressedSize === 0) {
      offset = dataStart + 1;
    } else {
      offset = dataStart + compressedSize;
    }
  }
  return null;
}

function parseBCFZ(buf) {
  // GP6 bzip2 format: BCFz header, then bzip2 compressed XML
  // Try to find bzip2 stream start (BZh signature)
  try {
    const bzStart = buf.indexOf(Buffer.from('BZh'));
    if (bzStart < 0) return null;
    const compressed = buf.slice(bzStart);
    // Node doesn't have built-in bzip2, but we can try zlib anyway
    // as some tools use deflate with BCFz header
    // Try deflate from after the 4-byte header
    try {
      const xml = zlib.inflateRawSync(buf.slice(4)).toString('utf8');
      if (xml.includes('<GPIF>')) return extractXmlMeta(xml);
    } catch(e) {}
    // Try from offset 8
    try {
      const xml = zlib.inflateRawSync(buf.slice(8)).toString('utf8');
      if (xml.includes('<GPIF>')) return extractXmlMeta(xml);
    } catch(e) {}
    return null;
  } catch(e) { return null; }
}

function extractGPMeta(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.length < 4) return null;

    const magic = buf.readUInt32LE(0);

    // ZIP format (GP7, or .gp files that are actually GP7)
    if (magic === 0x04034b50) {
      return parseZipGP(buf);
    }

    // BCFz format (GP6)
    if (buf.slice(0, 4).toString('ascii') === 'BCFz') {
      return parseBCFZ(buf);
    }

    // GP3/4/5 binary format
    return parseGP345(buf);

  } catch (e) { return null; }
}

module.exports = { extractGPMeta };
