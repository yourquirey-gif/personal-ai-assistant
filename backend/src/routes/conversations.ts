import { Router, type Response } from 'express'
import { ObjectId } from 'mongodb'
import { getDb } from '../db.js'
import { requireSession, type SessionUser } from '../auth/session.js'

export const conversationsRouter = Router()
conversationsRouter.use(requireSession)
function getUser(res: Response): SessionUser { return res.locals.user as SessionUser }

conversationsRouter.post('/conversations', async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 120) : 'New chat'
  try {
    const now = new Date()
    const result = await (await getDb()).collection('conversations').insertOne({ userId: getUser(res).userId, title: title || 'New chat', createdAt: now, updatedAt: now })
    return res.status(201).json({ conversation: { id: String(result.insertedId), title: title || 'New chat', createdAt: now, updatedAt: now } })
  } catch (error) { console.error('Create conversation error:', error); return res.status(500).json({ error: 'Unable to create conversation.' }) }
})

conversationsRouter.get('/conversations', async (_req, res) => {
  try {
    const items = await (await getDb()).collection('conversations').find({ userId: getUser(res).userId }).sort({ updatedAt: -1 }).limit(50).project({ title: 1, createdAt: 1, updatedAt: 1 }).toArray()
    return res.json({ conversations: items.map((item) => ({ id: String(item._id), title: item.title, createdAt: item.createdAt, updatedAt: item.updatedAt })) })
  } catch (error) { console.error('List conversations error:', error); return res.status(500).json({ error: 'Unable to load conversation history.' }) }
})

conversationsRouter.get('/conversations/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid conversation id.' })
  try {
    const db = await getDb()
    const conversation = await db.collection('conversations').findOne({ _id: new ObjectId(req.params.id), userId: getUser(res).userId })
    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' })
    const messages = await db.collection('messages').find({ conversationId: req.params.id, userId: getUser(res).userId }).sort({ createdAt: 1 }).limit(100).toArray()
    return res.json({ conversation: { id: String(conversation._id), title: conversation.title, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt }, messages: messages.map((item) => ({ id: String(item._id), role: item.role, content: item.content, sources: Array.isArray(item.sources) ? item.sources : [], createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt })) })
  } catch (error) { console.error('Get conversation error:', error); return res.status(500).json({ error: 'Unable to load conversation.' }) }
})

conversationsRouter.delete('/conversations/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid conversation id.' })
  try {
    const db = await getDb()
    const result = await db.collection('conversations').deleteOne({ _id: new ObjectId(req.params.id), userId: getUser(res).userId })
    if (!result.deletedCount) return res.status(404).json({ error: 'Conversation not found.' })
    await db.collection('messages').deleteMany({ conversationId: req.params.id, userId: getUser(res).userId })
    return res.json({ ok: true })
  } catch (error) { console.error('Delete conversation error:', error); return res.status(500).json({ error: 'Unable to delete conversation.' }) }
})
