/**
 * Memory Writer Service
 * Automatically writes key points to global memory using qwen-flash (cheap model)
 * Called every 2 messages to summarize conversation insights
 */

const TOKENMIX_API_KEY = process.env.TOKENMIX_CHAT_API_KEY || process.env.TOKENMIX_API_KEY || process.env.VITE_TOKENMIX_API_KEY || '';
const TOKENMIX_API_URL = 'https://api.tokenmix.ai/v1/chat/completions';

const BULLET_PREFIXES = ['- ', '* ', '• '];

function normalizeBulletLine(line) {
  return line
    .trim()
    .replace(/^\s*[-\*•]\s*/, '')
    .replace(/\.$/, '')
    .trim();
}

function parseBulletPoints(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => normalizeBulletLine(line));
}

function mergeMemoryPoints(currentMemory, newPoints) {
  const existingPoints = parseBulletPoints(currentMemory);
  const existingSet = new Set(existingPoints.map((point) => point.toLowerCase()));
  const merged = [...existingPoints];

  for (const point of newPoints) {
    const normalized = point.toLowerCase();
    if (!existingSet.has(normalized) && normalized.length > 0) {
      existingSet.add(normalized);
      merged.push(point);
    }
  }

  return merged.map((point) => `- ${point}`).join('\n');
}

function isQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim().toLowerCase();
  
  // Ends with or contains a question mark
  if (clean.includes('?')) return true;
  
  // Question words in Indonesian
  const indonesianQuestionWords = [
    'apa', 'apakah', 'bagaimana', 'mengapa', 'kenapa', 
    'siapa', 'siapakah', 'kapan', 'dimana', 'di mana', 
    'kemana', 'ke mana', 'darimana', 'dari mana', 
    'berapa', 'berapakah', 'mana'
  ];
  
  // Question words in English
  const englishQuestionWords = [
    'what', 'how', 'why', 'who', 'when', 'where', 
    'which', 'whose', 'whom', 'is', 'are', 'am', 
    'do', 'does', 'did', 'can', 'could', 'should', 
    'would', 'will', 'shall', 'may', 'might', 'must'
  ];
  
  const words = clean.split(/\s+/);
  if (words.length > 0) {
    const firstWord = words[0].replace(/[^a-z]/g, '');
    if (indonesianQuestionWords.includes(firstWord) || englishQuestionWords.includes(firstWord)) {
      return true;
    }
  }
  
  // Check if any question word is present at the start of sentences
  const sentenceStarts = clean.split(/[.!\n]+/).map(s => s.trim().split(/\s+/)[0]).filter(Boolean);
  for (const start of sentenceStarts) {
    const cleanStart = start.replace(/[^a-z]/g, '');
    if (indonesianQuestionWords.includes(cleanStart) || englishQuestionWords.includes(cleanStart)) {
      return true;
    }
  }
  
  return false;
}

export async function updateGlobalMemory(userId, recentMessages, currentMemory = '') {
  try {
    // Build conversation context from recent messages
    const conversationText = recentMessages
      .map((msg, idx) => {
        const role = msg.role === 'user' ? 'User' : 'AI';
        const text = typeof msg.content === 'string' ? msg.content : '';
        return `${idx + 1}. ${role}: ${text.substring(0, 200)}`;
      })
      .join('\n');

    // Build prompt for qwen-flash to manage memory dynamically
    const systemPrompt = `You are a memory manager for Deepernova AI, an AI assistant. Your job is to keep the user's long-term global memory accurate, relevant, and sharp.

Current Global Memory:
${currentMemory || '(empty)'}

Task:
Analyze the recent conversation and update the user's global memory. You must return the COMPLETE list of updated memory points.
In this memory list, you must record user queries, topics, and prompts from the recent conversation so Deepernova AI can read them as references in other rooms.

You can and must:
1. RECORD user prompts/queries, formatted as: "- User prompted: "[concise summary of prompt]""
2. WRITE new important facts about the user (e.g. preferences, name, work, interests).
3. MODIFY/REPLACE existing points if information has changed.
4. DELETE points that are outdated or incorrect.

Guidelines:
- Return the COMPLETE updated list of bullet points representing the user's global memory.
- Start each line with "- ".
- Keep each point very concise, sharp, and factual.
- If there are no updates or changes needed, output the exact current memory unchanged.
- Output ONLY the bullet points. Do not include introductory text, explanations, or code blocks.`;

    const userPrompt = `Recent conversation:\n${conversationText}\n\nProvide the complete updated global memory bullet points.`;

    // Call qwen-flash for memory writing (cheap model)
    const response = await fetch(TOKENMIX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKENMIX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepernova API error: ${response.status} ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const updatedMemoryText = data.choices?.[0]?.message?.content || '';
    let points = parseBulletPoints(updatedMemoryText);
    
    // Fallback if AI response was empty but we still want to keep existing memory
    if (points.length === 0 && currentMemory) {
      points = parseBulletPoints(currentMemory);
    }

    // Programmatically record user prompts from recentMessages to ensure they are always logged
    const userPrompts = recentMessages
      .filter(msg => msg.role === 'user')
      .map(msg => typeof msg.content === 'string' ? msg.content : '')
      .filter(txt => txt.trim().length > 0);

    const existingLower = new Set(points.map(p => p.toLowerCase()));

    for (const prompt of userPrompts) {
      const cleanPrompt = prompt.replace(/\r?\n/g, ' ').trim();
      if (!cleanPrompt) continue;
      
      // 1. Only record questions
      if (!isQuestion(cleanPrompt)) {
        continue;
      }

      // 2. Limit to 200 words to save tokens
      const wordCount = cleanPrompt.split(/\s+/).filter(Boolean).length;
      if (wordCount > 200) {
        console.log(`[MEMORY_WRITER] Skipping prompt recording because it has ${wordCount} words (limit is 200) to save tokens.`);
        continue;
      }

      // Get a concise slice of the prompt for memory
      const slicedPrompt = cleanPrompt.length > 80 ? cleanPrompt.substring(0, 80) + '...' : cleanPrompt;
      const promptPoint = `User prompted: "${slicedPrompt}"`;
      
      let isDuplicate = false;
      const promptLower = slicedPrompt.toLowerCase();
      for (const existing of existingLower) {
        if (existing.includes(promptLower) || promptLower.includes(existing)) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        points.push(promptPoint);
        existingLower.add(promptPoint.toLowerCase());
      }
    }

    if (points.length === 0) {
      console.log(`[MEMORY_WRITER] No memory points, retaining current memory for user ${userId}`);
      return currentMemory.trim();
    }

    const formattedMemory = points.map((point) => `- ${point}`).join('\n');
    console.log(`[MEMORY_WRITER] Memory updated for user ${userId}. Total points: ${points.length}`);

    return formattedMemory.trim();
  } catch (error) {
    console.error('[MEMORY_WRITER] Error updating global memory:', error.message);
    return currentMemory;
  }
}

export default {
  updateGlobalMemory
};
