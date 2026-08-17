/**
 * db.js — SQLite adapter that mimics the pg.Pool interface.
 *
 * All queries in server.js use PostgreSQL-style $1, $2... parameters.
 * This wrapper transparently converts them to SQLite-style ? parameters
 * so no SQL in server.js needs to be changed.
 *
 * Special handling:
 *  - RETURNING clauses: not supported in SQLite INSERT/UPDATE the same way,
 *    so we run the operation then fetch the row manually.
 *  - ANY($1::int[]) pattern: rewritten to use IN(?,?,?,...) dynamically.
 *  - CURRENT_TIMESTAMP: supported natively in SQLite.
 *  - SERIAL / BOOLEAN: handled in seed.js via INTEGER / INTEGER equivalents.
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Converts a PostgreSQL query with $1, $2... params and ANY($n::int[]) 
 * into a SQLite-compatible query with ? params.
 * Returns { sql, params }.
 */
function convertQuery(pgSql, pgParams) {
  if (!pgParams || pgParams.length === 0) {
    // Just replace $n with ? in case there are any stray ones
    return { sql: pgSql.replace(/\$\d+/g, '?'), params: [] };
  }

  let sql = pgSql;
  let params = [...pgParams];

  // Handle ANY($n::int[]) — array param expansion
  // e.g. WHERE o.id = ANY($1::int[]) with params=[[1,2,3]]
  // → WHERE o.id IN (?,?,?) with params=[1,2,3]
  sql = sql.replace(/=\s*ANY\s*\(\$(\d+)::int\[\]\)/gi, (match, numStr) => {
    const idx = parseInt(numStr, 10) - 1;
    const arr = params[idx];
    if (Array.isArray(arr)) {
      // Remove the array from params and splice in the individual values
      params.splice(idx, 1, ...arr);
      const placeholders = arr.map(() => '?').join(', ');
      return `IN (${placeholders})`;
    }
    return match;
  });

  // Replace remaining $n with ?
  sql = sql.replace(/\$\d+/g, '?');

  return { sql, params };
}

/**
 * Extracts the table name from an INSERT statement.
 */
function getTableFromInsert(sql) {
  const m = sql.match(/INSERT\s+INTO\s+(\w+)/i);
  return m ? m[1] : null;
}

/**
 * Runs a query and returns a pg-compatible result object: { rows: [...] }
 */
function query(pgSql, pgParams) {
  try {
    const { sql, params } = convertQuery(pgSql, pgParams);
    const trimmed = sql.trim().toUpperCase();

    // --- RETURNING clause handling ---
    // SQLite doesn't support RETURNING in the same way for all cases.
    // We detect it and handle INSERT/UPDATE specially.
    const hasReturning = /RETURNING/i.test(sql);

    if (hasReturning) {
      const sqlWithoutReturning = sql.replace(/RETURNING\s+[\w\s,\*]+$/i, '').trim();

      if (trimmed.startsWith('INSERT')) {
        const table = getTableFromInsert(sql);
        const stmt = db.prepare(sqlWithoutReturning);
        const info = stmt.run(...params);
        const lastId = info.lastInsertRowid;
        const row = db.prepare(`SELECT * FROM ${table} WHERE rowid = ?`).get(lastId);
        return { rows: row ? [row] : [] };
      }

      if (trimmed.startsWith('UPDATE')) {
        // Extract WHERE id = $n pattern to fetch the updated row
        const whereMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);
        const table = sql.match(/UPDATE\s+(\w+)/i)?.[1];
        const stmt = db.prepare(sqlWithoutReturning);
        stmt.run(...params);
        if (table && whereMatch) {
          // The last param before RETURNING params is the id
          const idParam = params[params.length - 1];
          const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(idParam);
          return { rows: row ? [row] : [] };
        }
        return { rows: [] };
      }
    }

    // --- Standard SELECT ---
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const rows = db.prepare(sql).all(...params);
      return { rows };
    }

    // --- DROP / CREATE / INSERT / UPDATE / DELETE ---
    // Support multi-statement DDL (e.g. seed.js drops + creates multiple tables)
    if (trimmed.startsWith('DROP') || trimmed.startsWith('CREATE')) {
      // Execute each statement separately
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const s of statements) {
        db.exec(s + ';');
      }
      return { rows: [] };
    }

    const stmt = db.prepare(sql);
    stmt.run(...params);
    return { rows: [] };

  } catch (err) {
    console.error('[db.js] Query error:', err.message);
    console.error('[db.js] SQL:', pgSql);
    console.error('[db.js] Params:', pgParams);
    throw err;
  }
}

/**
 * Exported pool-like interface to match pg's pool.query signature.
 */
const pool = {
  query: (sql, params) => Promise.resolve(query(sql, params)),
  connect: (cb) => {
    // Verify DB is accessible
    try {
      db.prepare('SELECT 1').get();
      console.log('Successfully connected to SQLite database:', DB_PATH);
      if (cb) cb(null, null, () => {});
    } catch (err) {
      if (cb) cb(err);
    }
  }
};

module.exports = { pool };
