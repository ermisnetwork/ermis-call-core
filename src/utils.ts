/**
 * Ermis Call Core — Utility Functions
 */

/**
 * Create a binary packet with header for sending via the WASM transport layer.
 *
 * Packet format:
 * - Config packets (videoConfig, audioConfig, transciverState, connected):
 *   [1 byte type] + [JSON payload]
 * - Data packets (video-key, video-delta, audio):
 *   [1 byte type] + [8 bytes timestamp (BigUint64)] + [binary payload]
 */
export const createPacketWithHeader = (
  data: ArrayBuffer | null,
  timestamp: number | null,
  type: string,
  configMsg: any,
): Uint8Array => {
  let HEADER_SIZE: number;
  let payload: Uint8Array;

  // Config messages
  if (
    ['videoConfig', 'audioConfig', 'transciverState'].includes(type) &&
    configMsg
  ) {
    HEADER_SIZE = 1;
    const jsonString = JSON.stringify(configMsg);
    const encoder = new TextEncoder();
    payload = encoder.encode(jsonString);
  } else if (type === 'connected') {
    HEADER_SIZE = 1;
    payload = new Uint8Array(0);
  } else {
    // Data packets
    HEADER_SIZE = 9;
    payload = new Uint8Array(data!);
  }

  const packet = new Uint8Array(HEADER_SIZE + payload.byteLength);

  let typeCode: number = 0;
  switch (type) {
    case 'videoConfig':
      typeCode = 0;
      break;
    case 'audioConfig':
      typeCode = 1;
      break;
    case 'video-key':
      typeCode = 2;
      break;
    case 'video-delta':
      typeCode = 3;
      break;
    case 'audio':
      typeCode = 4;
      break;
    case 'connected':
      typeCode = 6;
      break;
    case 'transciverState':
      typeCode = 7;
      break;
  }

  // Byte 0: Type code
  packet[0] = typeCode;

  // Byte 1-8: Timestamp (BigUint64, big-endian)
  if (timestamp !== null) {
    const view = new DataView(packet.buffer);
    view.setBigUint64(1, BigInt(timestamp), false);
  }

  packet.set(payload, HEADER_SIZE);

  return packet;
};

/**
 * Encode an ArrayBuffer to a base64 string.
 */
export const base64Encode = (arrayBuffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Replace HEVC codec level numbers to standard profile-tier-level values.
 */
export const replaceCodecNumber = (input: string): string => {
  const map: Record<string, string> = {
    '2048': '123',
    '4096': '153',
    '8192': '156',
    '16384': '183',
    '32768': '186',
  };

  const regex = /2048|4096|8192|16384|32768/g;

  if (!input.match(regex)) {
    return 'hev1.1.6.L123.B0';
  }

  return input.replace(regex, (match) => map[match]);
};
