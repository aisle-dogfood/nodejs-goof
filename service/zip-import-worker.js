const { parentPort, workerData } = require('worker_threads');
const path = require('path');
const zlib = require('zlib');

const MAX_IMPORT_ARCHIVE_BYTES = 1024 * 1024;
const MAX_IMPORT_ARCHIVE_ENTRY_COUNT = 25;
const MAX_IMPORT_ARCHIVE_ENTRY_BYTES = 1024 * 1024;
const MAX_IMPORT_ARCHIVE_COMPRESSION_RATIO = 100;
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_ENTRY_STORED = 0;
const ZIP_ENTRY_DEFLATED = 8;
const EOCD_MIN_SIZE = 22;
const MAX_ZIP_COMMENT_LENGTH = 0xffff;
const CENTRAL_DIRECTORY_FILE_HEADER_SIZE = 46;
const LOCAL_FILE_HEADER_SIZE = 30;
const ZIP64_PLACEHOLDER = 0xffffffff;

function getSafeZipEntryName(entryName) {
  const normalizedEntryName = String(entryName || '').replace(/\\/g, '/');
  const entryPathSegments = normalizedEntryName.split('/');
  let normalizedName;

  if (!normalizedEntryName || normalizedEntryName.indexOf('\0') !== -1) {
    throw new Error('Invalid zip entry name');
  }

  if (normalizedEntryName.charAt(0) === '/' || /^[A-Za-z]:\//.test(normalizedEntryName)) {
    throw new Error('Invalid zip entry path');
  }

  if (entryPathSegments.some(function (segment) {
    return segment === '..';
  })) {
    throw new Error('Invalid zip entry path');
  }

  normalizedName = path.posix.normalize(normalizedEntryName);

  if (!normalizedName || normalizedName === '.' || normalizedName === '/') {
    throw new Error('Invalid zip entry name');
  }

  if (normalizedName === '..' || normalizedName.indexOf('../') === 0 || normalizedName.indexOf('/../') !== -1) {
    throw new Error('Invalid zip entry path');
  }

  return normalizedName.replace(/\/$/, '');
}

function findEndOfCentralDirectoryOffset(zipBuffer) {
  let offset;
  const minimumOffset = Math.max(0, zipBuffer.length - EOCD_MIN_SIZE - MAX_ZIP_COMMENT_LENGTH);

  if (zipBuffer.length < EOCD_MIN_SIZE) {
    throw new Error('Invalid zip file uploaded');
  }

  for (offset = zipBuffer.length - EOCD_MIN_SIZE; offset >= minimumOffset; offset -= 1) {
    if (zipBuffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      return offset;
    }
  }

  throw new Error('Invalid zip file uploaded');
}

function parseCentralDirectoryEntries(zipBuffer) {
  const eocdOffset = findEndOfCentralDirectoryOffset(zipBuffer);
  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = zipBuffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const commentLength = zipBuffer.readUInt16LE(eocdOffset + 20);
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  const entries = [];
  let entryOffset;

  if (eocdOffset + EOCD_MIN_SIZE + commentLength !== zipBuffer.length) {
    throw new Error('Invalid zip file uploaded');
  }

  if (centralDirectoryOffset === ZIP64_PLACEHOLDER || centralDirectorySize === ZIP64_PLACEHOLDER || totalEntries === 0xffff) {
    throw new Error('Invalid zip file uploaded');
  }

  if (totalEntries > MAX_IMPORT_ARCHIVE_ENTRY_COUNT) {
    throw new Error('Zip archive contains too many entries');
  }

  if (centralDirectoryOffset > eocdOffset || centralDirectoryEnd > eocdOffset) {
    throw new Error('Invalid zip file uploaded');
  }

  entryOffset = centralDirectoryOffset;
  while (entryOffset < centralDirectoryEnd) {
    let compressedSize;
    let uncompressedSize;
    let fileNameLength;
    let extraFieldLength;
    let fileCommentLength;
    let localHeaderOffset;
    let recordSize;
    let entryName;

    if (entries.length >= MAX_IMPORT_ARCHIVE_ENTRY_COUNT) {
      throw new Error('Zip archive contains too many entries');
    }

    if (entryOffset + CENTRAL_DIRECTORY_FILE_HEADER_SIZE > centralDirectoryEnd) {
      throw new Error('Invalid zip file uploaded');
    }

    if (zipBuffer.readUInt32LE(entryOffset) !== CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE) {
      throw new Error('Invalid zip file uploaded');
    }

    compressedSize = zipBuffer.readUInt32LE(entryOffset + 20);
    uncompressedSize = zipBuffer.readUInt32LE(entryOffset + 24);
    fileNameLength = zipBuffer.readUInt16LE(entryOffset + 28);
    extraFieldLength = zipBuffer.readUInt16LE(entryOffset + 30);
    fileCommentLength = zipBuffer.readUInt16LE(entryOffset + 32);
    localHeaderOffset = zipBuffer.readUInt32LE(entryOffset + 42);
    recordSize = CENTRAL_DIRECTORY_FILE_HEADER_SIZE + fileNameLength + extraFieldLength + fileCommentLength;

    if (localHeaderOffset === ZIP64_PLACEHOLDER) {
      throw new Error('Invalid zip file uploaded');
    }

    if (recordSize < CENTRAL_DIRECTORY_FILE_HEADER_SIZE || entryOffset + recordSize > centralDirectoryEnd) {
      throw new Error('Invalid zip file uploaded');
    }

    entryName = zipBuffer.slice(entryOffset + CENTRAL_DIRECTORY_FILE_HEADER_SIZE, entryOffset + CENTRAL_DIRECTORY_FILE_HEADER_SIZE + fileNameLength).toString('utf8');

    entries.push({
      entryName: entryName,
      safeEntryName: getSafeZipEntryName(entryName),
      compressionMethod: zipBuffer.readUInt16LE(entryOffset + 10),
      compressedSize: compressedSize,
      uncompressedSize: uncompressedSize,
      localHeaderOffset: localHeaderOffset,
      isDirectory: /\/$/.test(entryName)
    });

    entryOffset += recordSize;
  }

  if (entryOffset !== centralDirectoryEnd || entries.length !== totalEntries) {
    throw new Error('Invalid zip file uploaded');
  }

  return entries;
}

function getCompressedEntryData(zipBuffer, entry) {
  const localHeaderOffset = entry.localHeaderOffset;
  let fileNameLength;
  let extraFieldLength;
  let localEntryName;
  let dataStart;
  let dataEnd;

  if (localHeaderOffset + LOCAL_FILE_HEADER_SIZE > zipBuffer.length) {
    throw new Error('Invalid zip entry data');
  }

  if (zipBuffer.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error('Invalid zip entry data');
  }

  fileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
  extraFieldLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
  localEntryName = zipBuffer.slice(localHeaderOffset + LOCAL_FILE_HEADER_SIZE, localHeaderOffset + LOCAL_FILE_HEADER_SIZE + fileNameLength).toString('utf8');

  if (getSafeZipEntryName(localEntryName) !== entry.safeEntryName) {
    throw new Error('Invalid zip entry data');
  }

  dataStart = localHeaderOffset + LOCAL_FILE_HEADER_SIZE + fileNameLength + extraFieldLength;
  dataEnd = dataStart + entry.compressedSize;

  if (dataStart < localHeaderOffset || dataEnd < dataStart || dataEnd > zipBuffer.length) {
    throw new Error('Invalid zip entry data');
  }

  return zipBuffer.slice(dataStart, dataEnd);
}

function inflateRawWithLimit(compressedData, maxOutputLength) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let totalLength = 0;
    let finished = false;
    const inflater = zlib.createInflateRaw();

    function fail(error) {
      if (finished) {
        return;
      }

      finished = true;
      inflater.removeAllListeners('data');
      inflater.removeAllListeners('error');
      inflater.removeAllListeners('end');
      inflater.destroy();
      reject(error);
    }

    inflater.on('data', function (chunk) {
      totalLength += chunk.length;
      if (totalLength > maxOutputLength) {
        fail(new Error('Zip entry exceeds size limit'));
        return;
      }

      chunks.push(chunk);
    });

    inflater.on('error', function () {
      fail(new Error('Zip entry exceeds size limit'));
    });

    inflater.on('end', function () {
      if (finished) {
        return;
      }

      finished = true;
      resolve(Buffer.concat(chunks, totalLength));
    });

    inflater.end(compressedData);
  });
}

function readZipEntryData(entry, compressedData, maxOutputLength) {
  if (!Buffer.isBuffer(compressedData)) {
    return Promise.reject(new Error('Invalid zip entry data'));
  }

  if (compressedData.length > MAX_IMPORT_ARCHIVE_BYTES) {
    return Promise.reject(new Error('Zip entry exceeds upload size limit'));
  }

  if (entry.compressionMethod === ZIP_ENTRY_STORED) {
    if (compressedData.length > maxOutputLength) {
      return Promise.reject(new Error('Zip entry exceeds size limit'));
    }

    return Promise.resolve(compressedData);
  }

  if (entry.compressionMethod !== ZIP_ENTRY_DEFLATED) {
    return Promise.reject(new Error('Unsupported zip entry compression method'));
  }

  return inflateRawWithLimit(compressedData, maxOutputLength);
}

async function readImportDataFromZip(zipBuffer) {
  const entries = parseCentralDirectoryEntries(zipBuffer);
  let backupEntry = null;
  let compressedBackupData;
  let backupData;

  if (!Buffer.isBuffer(zipBuffer) || zipBuffer.length > MAX_IMPORT_ARCHIVE_BYTES) {
    throw new Error('Zip archive exceeds upload size limit');
  }

  entries.forEach(function (entry) {
    if (!entry.isDirectory && entry.safeEntryName === 'backup.txt') {
      backupEntry = entry;
    }
  });

  if (!backupEntry) {
    return 'No backup.txt file found';
  }

  if (backupEntry.uncompressedSize > MAX_IMPORT_ARCHIVE_ENTRY_BYTES) {
    throw new Error('Zip entry exceeds size limit');
  }

  compressedBackupData = getCompressedEntryData(zipBuffer, backupEntry);
  backupData = await readZipEntryData(backupEntry, compressedBackupData, MAX_IMPORT_ARCHIVE_ENTRY_BYTES);

  if (compressedBackupData.length > 0 && backupData.length > (compressedBackupData.length * MAX_IMPORT_ARCHIVE_COMPRESSION_RATIO)) {
    throw new Error('Zip entry exceeds compression ratio limit');
  }

  return backupData.toString('ascii');
}

readImportDataFromZip(workerData).then(function (data) {
  parentPort.postMessage({ data: data });
}).catch(function (error) {
  parentPort.postMessage({ error: error.message });
});
