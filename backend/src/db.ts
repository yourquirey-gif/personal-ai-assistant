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

  await database.collection('users').createIndex({ googleId: 1 }, { unique: true, sparse: true })
  await database.collection('users').createIndex({ email: 1 }, { unique: true })
  await database.collection('passwordResets').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  await database.collection('passwordResets').createIndex({ email: 1, createdAt: -1 })

  return database
}
