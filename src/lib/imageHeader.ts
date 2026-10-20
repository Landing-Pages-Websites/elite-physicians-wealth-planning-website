/**
 * Reads the pixel dimensions of an image from its header, with no dependency
 * and no full decode.
 *
 * This file is the one image header parser in the repository. It is imported by
 * `src/lib/imageSize.ts`, which sizes blog images for `next/image` at build
 * time, and by `packages/managed-site-conversion/src/image-probe.ts`, which
 * builds the asset manifest for a customer repository being converted. It must
 * stay free of imports other than `node:fs`: it is copied into every customer
 * site along with the rest of `src/lib/`, and those sites are plain Next apps
 * with no workspace packages to resolve.
 *
 * The format list mirrors what the go-live blog migrator will commit into
 * `public/blog/<slug>/` — it sniffs magic bytes and accepts exactly JPEG, PNG,
 * GIF, BMP, WebP and AVIF (SVG is rejected there, since the starter does not
 * set `dangerouslyAllowSVG`). See `blogmig/images.py` in zleague/mega-clawhub.
 *
 * Every failure path returns null. Callers must fall back to their own answer,
 * so an unreadable or unrecognised file is never worse than not looking.
 */
import { closeSync, fstatSync, openSync, readSync } from "node:fs";

export interface ImageSize {
  width: number;
  height: number;
}

export type ReadBytes = (offset: number, length: number) => Buffer | null;

const MAX_HEADER_SCAN_BYTES = 512 * 1024;

const MARKER_SCAN_WINDOW = 512;

const EXIF_ORIENTATION_TAG = 0x0112;

function transpose(size: ImageSize): ImageSize {
  return { width: size.height, height: size.width };
}

function toSize(width: number, height: number): ImageSize | null {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function parsePng(read: ReadBytes): ImageSize | null {
  const header = read(12, 12);
  if (!header || header.toString("latin1", 0, 4) !== "IHDR") return null;
  return toSize(header.readUInt32BE(4), header.readUInt32BE(8));
}

function parseGif(read: ReadBytes): ImageSize | null {
  const screen = read(6, 4);
  if (!screen) return null;
  return toSize(screen.readUInt16LE(0), screen.readUInt16LE(2));
}

const BITMAP_CORE_HEADER_SIZE = 12;
const BITMAP_INFO_HEADER_SIZE = 40;

function parseBmp(read: ReadBytes): ImageSize | null {
  const dib = read(14, 12);
  if (!dib) return null;
  const headerSize = dib.readUInt32LE(0);
  if (headerSize === BITMAP_CORE_HEADER_SIZE) {
    return toSize(dib.readUInt16LE(4), dib.readUInt16LE(6));
  }
  if (headerSize < BITMAP_INFO_HEADER_SIZE) return null;
  return toSize(dib.readInt32LE(4), Math.abs(dib.readInt32LE(8)));
}

const WEBP_VP8L_SIGNATURE = 0x2f;
const WEBP_DIMENSION_MASK = 0x3fff;

function parseWebp(read: ReadBytes): ImageSize | null {
  const chunk = read(12, 4);
  if (!chunk) return null;
  switch (chunk.toString("latin1")) {
    case "VP8 ": {
      const frame = read(23, 7);
      if (!frame) return null;
      if (frame.readUIntBE(0, 3) !== 0x9d012a) return null;
      return toSize(
        frame.readUInt16LE(3) & WEBP_DIMENSION_MASK,
        frame.readUInt16LE(5) & WEBP_DIMENSION_MASK,
      );
    }
    case "VP8L": {
      const frame = read(20, 5);
      if (!frame || frame.readUInt8(0) !== WEBP_VP8L_SIGNATURE) return null;
      const bits = frame.readUInt32LE(1);
      return toSize(
        (bits & WEBP_DIMENSION_MASK) + 1,
        ((bits >>> 14) & WEBP_DIMENSION_MASK) + 1,
      );
    }
    case "VP8X": {
      const canvas = read(24, 6);
      if (!canvas) return null;
      return toSize(canvas.readUIntLE(0, 3) + 1, canvas.readUIntLE(3, 3) + 1);
    }
    default:
      return null;
  }
}

function isFrameHeader(marker: number): boolean {
  if (marker < 0xc0 || marker > 0xcf) return false;
  return marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function isStandalone(marker: number): boolean {
  if (marker === 0xd8 || marker === 0x01) return true;
  return marker >= 0xd0 && marker <= 0xd7;
}

function readExifOrientation(
  read: ReadBytes,
  start: number,
  length: number,
): number | null {
  const inSegment: ReadBytes = (offset, size) =>
    offset >= start && offset + size <= start + length
      ? read(offset, size)
      : null;

  if (inSegment(start, 6)?.toString("latin1") !== "Exif\0\0") return null;
  const tiff = start + 6;
  const header = inSegment(tiff, 8);
  if (!header) return null;
  const order = header.toString("latin1", 0, 2);
  if (order !== "II" && order !== "MM") return null;
  const little = order === "II";
  const readUInt16 = (buffer: Buffer, offset: number): number =>
    little ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);

  const directory =
    tiff + (little ? header.readUInt32LE(4) : header.readUInt32BE(4));
  const count = inSegment(directory, 2);
  if (!count) return null;

  const entries = readUInt16(count, 0);
  for (let index = 0; index < entries; index += 1) {
    const entry = inSegment(directory + 2 + index * 12, 12);
    if (!entry) return null;
    if (readUInt16(entry, 0) !== EXIF_ORIENTATION_TAG) continue;
    return readUInt16(entry, 8);
  }
  return null;
}

function findMarker(
  read: ReadBytes,
  from: number,
  limit: number,
): { code: number; at: number } | null {
  let offset = from;
  while (offset + 2 <= limit) {
    const window = read(offset, Math.min(MARKER_SCAN_WINDOW, limit - offset));
    if (!window || window.readUInt8(0) !== 0xff) return null;
    for (let index = 1; index < window.length; index += 1) {
      const code = window.readUInt8(index);
      if (code !== 0xff) return { code, at: offset + index - 1 };
    }
    offset += window.length - 1;
  }
  return null;
}

function parseJpeg(read: ReadBytes, fileSize: number): ImageSize | null {
  const limit = Math.min(fileSize, MAX_HEADER_SCAN_BYTES);
  let offset = 2;
  let orientation = 1;
  while (offset < limit) {
    const marker = findMarker(read, offset, limit);
    if (!marker) return null;
    if (isStandalone(marker.code)) {
      offset = marker.at + 2;
      continue;
    }
    if (marker.code === 0xda || marker.code === 0xd9) return null;

    const segment = read(marker.at + 2, 2);
    if (!segment) return null;
    const length = segment.readUInt16BE(0);
    if (length < 2) return null;

    if (isFrameHeader(marker.code)) {
      const frame = read(marker.at + 5, 4);
      if (!frame) return null;
      const stored = toSize(frame.readUInt16BE(2), frame.readUInt16BE(0));
      if (!stored) return null;
      return orientation >= 5 && orientation <= 8 ? transpose(stored) : stored;
    }
    if (marker.code === 0xe1) {
      orientation =
        readExifOrientation(read, marker.at + 4, length - 2) ?? orientation;
    }
    offset = marker.at + 2 + length;
  }
  return null;
}

interface Box {
  type: string;
  
  start: number;
  
  end: number;
}

const LARGE_SIZE_MARKER = 1;
const SIZE_TO_END_MARKER = 0;

const FULL_BOX_PREFIX = 4;

function readBoxes(read: ReadBytes, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    const header = read(offset, 8);
    if (!header) break;
    const declared = header.readUInt32BE(0);
    const type = header.toString("latin1", 4, 8);
    let contentStart = offset + 8;
    let boxEnd: number;
    if (declared === LARGE_SIZE_MARKER) {
      const large = read(offset + 8, 8);
      if (!large) break;
      boxEnd = offset + Number(large.readBigUInt64BE(0));
      contentStart = offset + 16;
    } else if (declared === SIZE_TO_END_MARKER) {
      boxEnd = end;
    } else {
      boxEnd = offset + declared;
    }
    if (boxEnd <= contentStart || boxEnd > end) break;
    boxes.push({ type, start: contentStart, end: boxEnd });
    offset = boxEnd;
  }
  return boxes;
}

function within(read: ReadBytes, box: Box): ReadBytes {
  return (offset, length) =>
    offset >= box.start && offset + length <= box.end
      ? read(offset, length)
      : null;
}

function readPrimaryItem(read: ReadBytes, pitm: Box | undefined): number | null {
  if (!pitm) return null;
  const inBox = within(read, pitm);
  const header = inBox(pitm.start, FULL_BOX_PREFIX);
  if (!header) return null;
  const wideItemIds = header.readUInt8(0) >= 1;
  const item = inBox(pitm.start + FULL_BOX_PREFIX, wideItemIds ? 4 : 2);
  if (!item) return null;
  return wideItemIds ? item.readUInt32BE(0) : item.readUInt16BE(0);
}

interface AssociationEntry {
  item: number;
  
  indices: number[];
  
  next: number;
}

function readAssociationEntry(
  read: ReadBytes,
  offset: number,
  wideItemIds: boolean,
  wideIndices: boolean,
): AssociationEntry | null {
  const itemIdBytes = wideItemIds ? 4 : 2;
  const indexBytes = wideIndices ? 2 : 1;
  const id = read(offset, itemIdBytes);
  const count = read(offset + itemIdBytes, 1);
  if (!id || !count) return null;

  const associations = count.readUInt8(0);
  const listAt = offset + itemIdBytes + 1;
  const listBytes = associations * indexBytes;
  const list = listBytes > 0 ? read(listAt, listBytes) : Buffer.alloc(0);
  if (!list) return null;

  return {
    item: wideItemIds ? id.readUInt32BE(0) : id.readUInt16BE(0),
    indices: Array.from({ length: associations }, (_unused, index) =>
      wideIndices
        ? list.readUInt16BE(index * 2) & 0x7fff
        : list.readUInt8(index) & 0x7f,
    ),
    next: listAt + listBytes,
  };
}

function readPropertyIndices(
  read: ReadBytes,
  ipma: Box,
  item: number,
): number[] | null {
  const inBox = within(read, ipma);
  const header = inBox(ipma.start, FULL_BOX_PREFIX + 4);
  if (!header) return null;
  const wideItemIds = header.readUInt8(0) >= 1;
  const wideIndices = (header.readUIntBE(1, 3) & 1) === 1;
  const entries = header.readUInt32BE(FULL_BOX_PREFIX);

  let offset = ipma.start + FULL_BOX_PREFIX + 4;
  for (let entry = 0; entry < entries; entry += 1) {
    const association = readAssociationEntry(
      inBox,
      offset,
      wideItemIds,
      wideIndices,
    );
    if (!association) return null;
    if (association.item === item) return association.indices;
    offset = association.next;
  }
  return null;
}

function readSpatialExtents(read: ReadBytes, ispe: Box): ImageSize | null {
  const extent = within(read, ispe)(ispe.start + FULL_BOX_PREFIX, 8);
  if (!extent) return null;
  return toSize(extent.readUInt32BE(0), extent.readUInt32BE(4));
}

function readQuarterTurns(read: ReadBytes, irot: Box | undefined): number {
  if (!irot) return 0;
  const angle = within(read, irot)(irot.start, 1);
  return angle ? angle.readUInt8(0) & 0x03 : 0;
}

function parseAvif(read: ReadBytes, fileSize: number): ImageSize | null {
  const end = Math.min(fileSize, MAX_HEADER_SCAN_BYTES);
  const meta = readBoxes(read, 0, end).find((box) => box.type === "meta");
  if (!meta) return null;

  const children = readBoxes(read, meta.start + FULL_BOX_PREFIX, meta.end);
  const primary = readPrimaryItem(
    read,
    children.find((box) => box.type === "pitm"),
  );
  const iprp = children.find((box) => box.type === "iprp");
  if (primary === null || !iprp) return null;

  const properties = readBoxes(read, iprp.start, iprp.end);
  const ipco = properties.find((box) => box.type === "ipco");
  const ipma = properties.find((box) => box.type === "ipma");
  if (!ipco || !ipma) return null;

  const indices = readPropertyIndices(read, ipma, primary);
  if (!indices) return null;

  const declared = readBoxes(read, ipco.start, ipco.end);
  const owned = indices
    .map((index) => declared[index - 1])
    .filter((box): box is Box => box !== undefined);

  const extents = owned.find((box) => box.type === "ispe");
  if (!extents) return null;
  const stored = readSpatialExtents(read, extents);
  if (!stored) return null;

  const turns = readQuarterTurns(read, owned.find((box) => box.type === "irot"));
  return turns % 2 === 1 ? transpose(stored) : stored;
}

export type ImageFormat = "png" | "gif" | "bmp" | "jpeg" | "webp" | "avif";

export interface ImageHeader extends ImageSize {
  readonly format: ImageFormat;
}

const MAGIC_BYTES = 12;

const GIF_SIGNATURES = new Set(["GIF87a", "GIF89a"]);

const AVIF_BRANDS = new Set(["avif", "avis"]);

const MAX_FTYP_BYTES = 1024;

function hasAvifBrand(read: ReadBytes): boolean {
  const header = read(0, 16);
  if (!header) return false;
  if (AVIF_BRANDS.has(header.toString("latin1", 8, 12))) return true;
  const limit = Math.min(header.readUInt32BE(0), MAX_FTYP_BYTES);
  if (limit <= 16) return false;
  const compatible = read(16, limit - 16);
  if (!compatible) return false;
  for (let offset = 0; offset + 4 <= compatible.length; offset += 4) {
    if (AVIF_BRANDS.has(compatible.toString("latin1", offset, offset + 4))) {
      return true;
    }
  }
  return false;
}

function detectFormat(magic: Buffer, read: ReadBytes): ImageFormat | null {
  if (magic.toString("latin1", 0, 8) === "\x89PNG\r\n\x1a\n") return "png";
  if (GIF_SIGNATURES.has(magic.toString("latin1", 0, 6))) return "gif";
  if (magic.toString("latin1", 0, 2) === "BM") return "bmp";
  if (magic.readUInt8(0) === 0xff && magic.readUInt8(1) === 0xd8) return "jpeg";
  if (
    magic.toString("latin1", 0, 4) === "RIFF" &&
    magic.toString("latin1", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (magic.toString("latin1", 4, 8) === "ftyp") {
    return hasAvifBrand(read) ? "avif" : null;
  }
  return null;
}

const PARSERS: Record<
  ImageFormat,
  (read: ReadBytes, fileSize: number) => ImageSize | null
> = {
  png: parsePng,
  gif: parseGif,
  bmp: parseBmp,
  jpeg: parseJpeg,
  webp: parseWebp,
  avif: parseAvif,
};

function bounded(
  fileSize: number,
  fetch: (offset: number, length: number) => Buffer | null,
): ReadBytes {
  return (offset, length) => {
    if (offset < 0 || length <= 0) return null;
    if (offset + length > fileSize) return null;
    return fetch(offset, length);
  };
}

export function parseImageHeader(
  read: ReadBytes,
  fileSize: number,
): ImageHeader | null {
  const magic = read(0, MAGIC_BYTES);
  if (!magic) return null;
  const format = detectFormat(magic, read);
  if (format === null) return null;
  const size = PARSERS[format](read, fileSize);
  return size === null ? null : { format, width: size.width, height: size.height };
}

export function parseImageHeaderFrom(bytes: Buffer): ImageHeader | null {
  const read = bounded(bytes.byteLength, (offset, length) =>
    bytes.subarray(offset, offset + length),
  );
  return parseImageHeader(read, bytes.byteLength);
}

export function readImageHeader(absolutePath: string): ImageHeader | null {
  let descriptor: number;
  try {
    descriptor = openSync(absolutePath, "r");
  } catch {
    return null;
  }
  try {
    const fileSize = fstatSync(descriptor).size;
    const read = bounded(fileSize, (offset, length) => {
      const buffer = Buffer.alloc(length);
      const bytes = readSync(descriptor, buffer, 0, length, offset);
      return bytes === length ? buffer : null;
    });
    return parseImageHeader(read, fileSize);
  } catch {
    return null;
  } finally {
    closeSync(descriptor);
  }
}
