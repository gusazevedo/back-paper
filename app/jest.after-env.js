/* eslint-env jest */
// React Query keeps garbage-collection timers alive; clear the shared client after each test
// so Jest can exit when a single file runs.
const { queryClient } = require('./src/lib/queryClient');

afterEach(() => {
  queryClient.clear();
});
