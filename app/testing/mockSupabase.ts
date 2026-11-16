/**
 * In-memory stand-in for the supabase-js client used by the app, for Jest.
 * Usage in a test file:
 *   jest.mock('../src/lib/supabase', () => ({ supabase: require('../testing/mockSupabase').createSupabaseMock() }));
 */
type Listener = (event: string, session: unknown) => void;
type Result = { data: unknown; error: unknown; count?: number | null };

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

export function createSupabaseMock() {
  const listeners: Listener[] = [];
  const state = {
    session: null as unknown,
    tables: {} as Record<string, unknown[]>,
    /** Rows an RPC returns, or a handler `(args) => Result` for args-dependent answers or errors. */
    rpc: {} as Record<string, unknown>,
    functions: {} as Record<string, (body: unknown) => Result>,
  };

  const emit = (next: unknown) => {
    state.session = next;
    listeners.forEach(l => l('change', next));
  };

  const from = (table: string) => {
    const filters: [string, unknown][] = [];
    let single = false;
    let headCount = false;
    const run = (): Result => {
      const rows = (state.tables[table] ?? []).filter(row =>
        filters.every(
          ([col, val]) => (row as Record<string, unknown>)[col] === val,
        ),
      );
      if (headCount) return { data: null, error: null, count: rows.length };
      if (single)
        return rows[0]
          ? { data: rows[0], error: null }
          : { data: null, error: new Error('not found') };
      return { data: rows, error: null };
    };
    const builder = {
      select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
        headCount = !!opts?.head;
        return builder;
      },
      eq: (col: string, val: unknown) => {
        filters.push([col, val]);
        return builder;
      },
      order: () => builder,
      single: () => {
        single = true;
        return builder;
      },
      then: (
        resolve: (r: Result) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  };

  return {
    __state: state,
    __setSession: (s: unknown) => {
      state.session = s;
    },
    auth: {
      getSession: jest.fn(async () => ({ data: { session: state.session } })),
      onAuthStateChange: jest.fn((l: Listener) => {
        listeners.push(l);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
      signInWithIdToken: jest.fn(async () => {
        emit({ access_token: 'jwt', user: { id: 'u1' } });
        return { error: null };
      }),
      signOut: jest.fn(async () => {
        emit(null);
        return { error: null };
      }),
    },
    from: jest.fn(from),
    rpc: jest.fn(async (name: string, args?: unknown): Promise<Result> => {
      const entry = state.rpc[name];
      return typeof entry === 'function'
        ? entry(args)
        : { data: entry ?? [], error: null };
    }),
    functions: {
      invoke: jest.fn(async (name: string, opts: { body: unknown }) => {
        const handler = state.functions[name];
        return handler
          ? handler(opts.body)
          : { data: null, error: new Error(`no handler for ${name}`) };
      }),
    },
  };
}
