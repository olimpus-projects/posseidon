import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

type statusTypes = 'pending' | 'processing' | 'completed' | 'failed';
export interface QueueItem {
  id?: number;
  timestamp: number;
  callback_url: string;
  file: string;
  status: statusTypes;
  attempts?: number;
  error_message?: string;
  metadata?: string;
}

export class SqliteQueue {
  private db: Database<sqlite3.Database, sqlite3.Statement> | null = null;
  private dbPath: string;

  constructor(dbPath: string = path.join(process.cwd(), 'posseidon_queue.db')) {
    this.dbPath = dbPath;
  }

  /**
   * Inicializa o banco de dados e cria a tabela se não existir
   */
  async initialize(): Promise<void> {
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        callback_url TEXT NOT NULL,
        file TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
        attempts INTEGER DEFAULT 0,
        error_message TEXT,
        metadata TEXT,
        processed_at INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
      CREATE INDEX IF NOT EXISTS idx_queue_timestamp ON queue(timestamp);
    `);
  }

  /**
   * Adiciona um novo item à fila
   */
  async enqueue(item: Omit<QueueItem, 'id' | 'status' | 'timestamp' | 'attempts'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const timestamp = Date.now();
    const result = await this.db.run(
      `INSERT INTO queue (timestamp, callback_url, file, status, attempts)
       VALUES (?, ?, ?, 'pending', 0)`,
      [timestamp, item.callback_url, item.file]
    );
  }

  /**
   * Obtém o próximo item pendente da fila
   */
  async dequeue(): Promise<QueueItem | null> {
    if (!this.db) throw new Error('Database not initialized');

    // Usando transação para evitar condições de corrida
    if (!this.db) throw new Error('Database not initialized');
    let item: QueueItem | undefined;
    try {
      await this.db.run('BEGIN TRANSACTION');
      item = await this.db.get<QueueItem>(
        `SELECT * FROM queue 
         WHERE status = 'pending' 
         ORDER BY timestamp ASC 
         LIMIT 1`
      );
      if (!item) {
        await this.db.run('ROLLBACK');
        return null;
      }
      await this.db.run(
        `UPDATE queue 
         SET status = 'processing', attempts = attempts + 1 
         WHERE id = ?`,
        [item.id]
      );
      await this.db.run('COMMIT');
      return item;
    } catch (err) {
      await this.db.run('ROLLBACK');
      throw err;
    }
  }

  /**
   * Atualiza o status de um item
   */
  async updateStatus(id: number, status: 'processing' | 'completed' | 'failed', errorMessage?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `UPDATE queue 
       SET status = ?, error_message = ?, processed_at = ?
       WHERE id = ?`,
      [status, errorMessage, status !== 'processing' ? Date.now() : null, id]
    );
  }

  /**
   * Remove um item da fila após o processamento
   */
  async remove(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run(`DELETE FROM queue WHERE id = ?`, [id]);
  }

  /**
   * Obtém uma lista de itens com um status específico
   * @param status O status dos itens a serem recuperados
   */
  async getStatus(status: statusTypes): Promise<QueueItem[] | null> {
    if (!this.db) throw new Error('Database not initialized');
    const items = await this.db.get<QueueItem[]>(`SELECT * FROM queue WHERE status = ?`, [status]);
    return items ?? null;
  }

  /**
   * Lista todos os itens na fila (para monitoramento)
   */
  async listAll(): Promise<QueueItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.all<QueueItem[]>(`SELECT * FROM queue ORDER BY timestamp ASC`);
  }

  /**
   * Retorna itens falhos para reprocessamento
   */
  async retryFailed(maxAttempts: number = 3): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.run(
      `UPDATE queue 
       SET status = 'pending' 
       WHERE status = 'failed' AND attempts < ?`,
      [maxAttempts]
    );
    return result.changes || 0;
  }

  /**
   * Fecha a conexão com o banco de dados
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export default SqliteQueue;