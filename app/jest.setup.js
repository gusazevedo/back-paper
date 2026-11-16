/* eslint-env jest */
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('@bam.tech/react-native-image-resizer', () => ({
  __esModule: true,
  default: {
    createResizedImage: jest.fn(async () => ({
      uri: 'file:///cache/thumb.webp',
      path: '/cache/thumb.webp',
      size: 1000,
      width: 720,
      height: 1280,
      name: 'thumb.webp',
    })),
  },
}));

jest.mock('react-native-blob-util', () => {
  const fetch = jest.fn(() => {
    const result = Promise.resolve({ info: () => ({ status: 200 }) });
    result.uploadProgress = (_config, cb) => {
      cb(1, 1);
      return result;
    };
    return result;
  });
  return {
    __esModule: true,
    default: { fetch, wrap: p => `RNFetchBlob-file://${p}` },
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  types: { images: 'image/*' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: e => !!e && typeof e === 'object' && 'code' in e,
}));
