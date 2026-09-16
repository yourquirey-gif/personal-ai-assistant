import { MongoClient, type Db } from 'mongodb'
import { config } from './config.js'

let client: MongoClient | null = null
let database: Db | null = null

export async function getDb(): Promise<Db> {
  if (database) return database
  if (!config.mongoUri) throw new Error('MONGODB_URI is not configured')

  client = new MongoClient(config.mongoUri)
  await client.connect()
  database = client.db(config.mongoDbName)

  const users = database.collection('users')
  await users.dropIndex('googleId_1').catch(() => undefined)
  await users.createIndex({ googleId: 1 }, { unique: true, sparse: true })
  await users.createIndex({ email: 1 }, { unique: true })

  const passwordResets = database.collection('passwordResets')
  await passwordResets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  await passwordResets.createIndex({ email: 1, createdAt: -1 })

  return database
}
