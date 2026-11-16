/* eslint-env jest */
// React Query keeps garbage-collection timers alive. Unmount the tree first (so no
// observer re-schedules a timer afterwards), then clear the shared client, so Jest
// can exit when a single file runs.
const { cleanup } = require('@testing-library/react-native');
const { queryClient } = require('./src/lib/queryClient');

afterEach(async () => {
  await cleanup();
  queryClient.clear();
});
