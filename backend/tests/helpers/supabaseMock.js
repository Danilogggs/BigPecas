/**
 * Mock do query builder do supabase-js.
 *
 * O cliente real encadeia metodos (`from(...).select(...).eq(...)`) e o objeto
 * final e "thenable". Este mock reproduz esse contrato: cada metodo registra a
 * chamada e devolve o proprio builder, e o `await` resolve com o resultado que o
 * teste configurou para a tabela.
 */

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'is',
  'like',
  'ilike',
  'or',
  'match',
  'not',
  'contains',
  'order',
  'range',
  'limit',
  'single',
  'maybeSingle',
];

function criarBuilder(table, resolver, calls) {
  const state = {
    table,
    operations: [],
    operacao(method) {
      return this.operations.find((operation) => operation.method === method) || null;
    },
    argumentos(method) {
      return this.operacao(method)?.args ?? null;
    },
  };

  const builder = {};

  CHAIN_METHODS.forEach((method) => {
    builder[method] = jest.fn((...args) => {
      state.operations.push({ method, args });
      return builder;
    });
  });

  builder.then = (onFulfilled, onRejected) => {
    let resultado;

    try {
      resultado = resolver(state);
    } catch (error) {
      return Promise.reject(error).then(onFulfilled, onRejected);
    }

    return Promise.resolve(resultado).then(onFulfilled, onRejected);
  };

  builder.__state = state;
  calls.push(state);

  return builder;
}

function createSupabaseMock() {
  const padroes = new Map();
  const filas = new Map();
  const calls = [];

  function resolver(state) {
    const fila = filas.get(state.table);

    if (fila && fila.length > 0) {
      const proximo = fila.shift();
      return typeof proximo === 'function' ? proximo(state) : proximo;
    }

    if (padroes.has(state.table)) {
      const padrao = padroes.get(state.table);
      return typeof padrao === 'function' ? padrao(state) : padrao;
    }

    throw new Error(
      `Nenhum resultado configurado para a tabela "${state.table}". ` +
        'Use __mockTable ou __queueTable no teste.',
    );
  }

  const supabase = {
    from: jest.fn((table) => criarBuilder(table, resolver, calls)),
    auth: {
      getUser: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        listUsers: jest.fn(),
        getUserById: jest.fn(),
        updateUserById: jest.fn(),
      },
    },

    /** Resultado fixo devolvido sempre que a tabela for consultada. */
    __mockTable(table, resultado) {
      padroes.set(table, resultado);
      return supabase;
    },

    /** Resultados consumidos em ordem a cada consulta na tabela. */
    __queueTable(table, ...resultados) {
      filas.set(table, [...(filas.get(table) || []), ...resultados]);
      return supabase;
    },

    /** Todas as consultas realizadas, na ordem em que foram criadas. */
    get __calls() {
      return calls;
    },

    /** Consultas feitas em uma tabela especifica. */
    __callsFor(table) {
      return calls.filter((state) => state.table === table);
    },

    __reset() {
      padroes.clear();
      filas.clear();
      calls.length = 0;
    },
  };

  return supabase;
}

module.exports = { createSupabaseMock };
