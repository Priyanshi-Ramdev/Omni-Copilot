const { Memory } = require('../db/database');

/**
 * Store or update a small piece of information about the user.
 * @param {object} args { key, value, category }
 */
async function upsertMemory({ key, value, category = 'general', userId }) {
    try {
        const memory = await Memory.findOneAndUpdate(
            { key: key.toLowerCase(), userId },
            { value, category, updated_at: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return { success: true, memory };
    } catch (error) {
        console.error('[Memory Tool Error]', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Search for memoized facts using keyword matching on keys.
 * @param {object} args { query }
 */
async function searchMemory({ query, userId }) {
    try {
        // Simple regex search on keys for now
        const regex = new RegExp(query, 'i');
        const memories = await Memory.find({ 
            userId,
            $or: [
                { key: regex },
                { category: regex }
            ]
        });
        return { success: true, memories: memories.map(m => ({ key: m.key, value: m.value })) };
    } catch (error) {
        console.error('[Memory Tool Error]', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Clear all memories.
 */
async function clearAllMemories() {
    try {
        await Memory.deleteMany({});
        return { success: true, message: 'All memories cleared.' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = { upsertMemory, searchMemory, clearAllMemories };
