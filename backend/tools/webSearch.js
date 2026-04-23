const axios = require('axios');

/**
 * Perform a web search using the Tavily API.
 * @param {object} args { query, search_depth }
 */
async function webSearch({ query, search_depth = 'basic' }) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        return { error: 'TAVILY_API_KEY is not configured in .env. Please get one from tavily.com' };
    }

    try {
        const response = await axios.post('https://api.tavily.com/search', {
            api_key: apiKey,
            query: query,
            search_depth: search_depth,
            include_answer: true,
            max_results: 5
        });

        const { results, answer } = response.data;
        
        return {
            answer: answer || 'No direct answer found, see results below.',
            results: results.map(r => ({
                title: r.title,
                url: r.url,
                content: r.content.substring(0, 500) + '...'
            }))
        };
    } catch (error) {
        console.error('[WebSearch Tool Error]', error.response?.data || error.message);
        return { error: error.response?.data?.detail || error.message };
    }
}

module.exports = { webSearch };
