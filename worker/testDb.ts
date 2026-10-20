import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

type Params = Array<string | number | null>

// Simula lo que usamos de D1 con SQLite de Node, para probar sin Cloudflare.
class FakeStatement {
  private readonly db: DatabaseSync
  private readonly sql: string
  private params: Params = []

  constructor(db: DatabaseSync, sql: string) {
    this.db = db
    this.sql = sql
  }

  bind(...params: Params): this {
    this.params = params
    return this
  }

  run(): void {
    this.db.prepare(this.sql).run(...this.params)
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.db.prepare(this.sql).all(...this.params) as T[] }
  }

  async first<T>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this.params) as T) ?? null
  }
}

export function createTestDb(): D1Database {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')

  const migrations = join(import.meta.dirname, '..', 'migrations')
  for (const file of readdirSync(migrations).sort()) {
    db.exec(readFileSync(join(migrations, file), 'utf8'))
  }

  const fake = {
    prepare: (sql: string) => new FakeStatement(db, sql),
    // Como en D1, el lote es atómico: si algo falla, no se guarda nada.
    async batch(statements: FakeStatement[]) {
      db.exec('BEGIN')
      try {
        for (const statement of statements) {
          statement.run()
        }
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
  }
  return fake as unknown as D1Database
}
