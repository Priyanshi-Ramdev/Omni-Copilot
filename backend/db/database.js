const mongoose = require('mongoose');

let dbConnection;

let isUsingMemory = false;
const memoryStore = {
  users: [],
  tokens: [],
  conversations: [],
  messages: [],
  analytics: [],
  memories: [],
};

async function getDb() {
  if (dbConnection) return dbConnection;
  
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Omnicopilot';
  try {
    console.log(`[DB] Attempting to connect to MongoDB: ${uri}...`);
    dbConnection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000, // 2 second timeout for faster fallback
    });
    console.log('[DB] MongoDB connected and models initialized');
    return dbConnection;
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message);
    console.warn('\n⚠️  STABILIZATION FALLBACK: Using temporary in-memory database.');
    console.warn('👉 Your data will NOT be saved after the server restarts.');
    console.warn('👉 Please start your MongoDB service (mongod) to enable persistence.\n');
    
    isUsingMemory = true;
    dbConnection = { isMemory: true }; // Mock connection object
    return dbConnection;
  }
}

// ── Models ───────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const TokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: String, required: true },
  access_token: { type: String, required: true },
  refresh_token: String,
  token_expiry: Number,
  extra_data: String,
  connected_at: { type: Date, default: Date.now }
});

// Compound index to ensure one token per service per user
TokenSchema.index({ userId: 1, service: 1 }, { unique: true });

const ConversationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  conversation_id: { type: String, required: true, index: true },
  role: String,
  content: String,
  created_at: { type: Date, default: Date.now }
});

const AnalyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  event_type: { type: String, required: true },
  tool_name: String,
  status: { type: String, default: 'success' },
  metadata: Object,
  created_at: { type: Date, default: Date.now }
});

const MemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  key: { type: String, required: true },
  value: { type: String, required: true },
  category: { type: String, default: 'general' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

/**
 * Enhanced models with in-memory fallback methods
 */
const useFallback = (model, storeKey) => {
  const wrap = (method, fallbackFn) => {
    const original = model[method].bind(model);
    model[method] = (...args) => {
      if (isUsingMemory) {
        // Return a thenable object to support 'await' and chaining
        const data = fallbackFn(...args);
        const queryProxy = {
          then: (resolve) => resolve(data),
          sort: () => queryProxy,
          limit: () => queryProxy,
          select: () => queryProxy,
          exec: async () => data,
        };
        return queryProxy;
      }
      return original(...args);
    };
  };

  // Mock findOne
  wrap('findOne', (query) => memoryStore[storeKey].find(item => 
    !query || Object.entries(query).every(([k, v]) => item[k] === v)
  ) || null);
  
  // Mock find
  wrap('find', (query) => memoryStore[storeKey].filter(item => 
    !query || Object.entries(query).every(([k, v]) => item[k] === v)
  ));

  // Mock findOneAndUpdate (needs to be async/directly handled)
  const originalUpdate = model.findOneAndUpdate.bind(model);
  model.findOneAndUpdate = async (query, update, options = {}) => {
    if (isUsingMemory) {
      let item = memoryStore[storeKey].find(i => Object.entries(query).every(([k, v]) => i[k] === v));
      if (!item && options.upsert) {
        item = { ...query, ...update, created_at: new Date(), updated_at: new Date() };
        memoryStore[storeKey].push(item);
      } else if (item) {
        Object.assign(item, update);
        item.updated_at = new Date();
      }
      return item;
    }
    return originalUpdate(query, update, options);
  };

  // Mock deleteOne
  const originalDelete = model.deleteOne.bind(model);
  model.deleteOne = async (query) => {
    if (isUsingMemory) {
      const index = memoryStore[storeKey].findIndex(i => Object.entries(query).every(([k, v]) => i[k] === v));
      if (index > -1) memoryStore[storeKey].splice(index, 1);
      return { deletedCount: index > -1 ? 1 : 0 };
    }
    return originalDelete(query);
  };
};

const User = mongoose.model('User', UserSchema);
const Token = mongoose.model('Token', TokenSchema);
const Conversation = mongoose.model('Conversation', ConversationSchema);
const Message = mongoose.model('Message', MessageSchema);
const Analytics = mongoose.model('Analytics', AnalyticsSchema);
const Memory = mongoose.model('Memory', MemorySchema);

// Apply fallbacks
useFallback(User, 'users');
useFallback(Token, 'tokens');
useFallback(Conversation, 'conversations');
useFallback(Message, 'messages');
useFallback(Analytics, 'analytics');
useFallback(Memory, 'memories');

// Mock save/updateOne for instances if needed, but for simplicity we rely on findOneAndUpdate
Message.prototype.save = async function() {
  if (isUsingMemory) {
    memoryStore.messages.push(this.toObject());
    return this;
  }
  return mongoose.Model.prototype.save.call(this);
};

Token.updateOne = async (query, update) => {
  if (isUsingMemory) {
    const item = memoryStore.tokens.find(i => Object.entries(query).every(([k, v]) => i[k] === v));
    if (item) Object.assign(item, update);
    return { nModified: 1 };
  }
  return mongoose.Model.updateOne.call(Token, query, update);
};


module.exports = { getDb, User, Token, Conversation, Message, Analytics, Memory };

