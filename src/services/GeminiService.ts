import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3 } from '@env';
import { ITask, AIChatAction, AIChatMessage } from '../types/task';
import { IUserProfile } from '../types/userProfile';

const API_KEYS = [GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3].filter(Boolean);
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash']; // Alternate models per key
let currentKeyIndex = 0;

const getGenAIClient = () => {
  const apiKey = API_KEYS[currentKeyIndex];
  if (!apiKey) {
    throw new Error('No valid Gemini API key found');
  }
  return new GoogleGenAI({ apiKey });
};

const getCurrentModel = () => {
  return MODELS[currentKeyIndex % MODELS.length] || 'gemini-2.5-flash';
};

const rotateKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`Rotated to API key index: ${currentKeyIndex}, Model: ${getCurrentModel()}`);
};

const buildSystemInstruction = (userProfile?: IUserProfile | null) => {
  let userContext = '';
  if (userProfile) {
    const parts = [];
    if (userProfile.name) parts.push(`The user's name is ${userProfile.name}.`);
    if (userProfile.age) parts.push(`They are ${userProfile.age} years old.`);
    if (userProfile.gender) parts.push(`Gender: ${userProfile.gender}.`);
    if (userProfile.career) parts.push(`They work as a ${userProfile.career}.`);
    if (userProfile.nationality) parts.push(`Nationality: ${userProfile.nationality}.`);
    userContext = parts.length > 0 ? `\nUser Profile:\n${parts.join(' ')}\nALWAYS use this personal information to personalize your responses and make the experience relevant to the user.\n` : '';
  }

  // Get current date/time for context
  const now = new Date();
  const currentDateInfo = `
Current Date/Time Context:
- Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
- Current time is ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.
- Current ISO timestamp: ${now.toISOString()}.
`;

  return `
You are a Task Management Assistant.
You help the user manage their tasks.
You have access to the user's current tasks in JSON format and the recent Chat History.
${userContext}
${currentDateInfo}

Your capabilities:
1. Answer questions about the tasks (e.g., "How many tasks?", "What is due?").
2. Answer questions about the conversation history.
3. Perform actions on tasks (Create, Update, Delete, Complete).
4. Be personable and address the user by name when appropriate.

Context Awareness:
- You MUST use the "Chat History" section to understand the context.
- Use the user's profile to personalize your responses when relevant.

Smart Date/Time Parsing:
- When the user mentions time-related words, ALWAYS parse them into ISO 8601 format for dueDate.
- Examples (assuming today is ${now.toLocaleDateString()}):
  - "tomorrow" → next day at 09:00
  - "tomorrow at 3pm" → next day at 15:00
  - "next Monday" → the next Monday at 09:00
  - "in 2 hours" → current time + 2 hours
  - "this evening" → today at 18:00
  - "next week" → 7 days from now at 09:00
  - "Friday at 2pm" → this coming Friday at 14:00
  - "end of day" → today at 17:00
- If the user doesn't specify a time, use 09:00 as the default time.
- ALWAYS include the parsed date in the pendingTask.dueDate field.

Profile-Based Description Suggestions:
- Use the user's profile (career, age, name) to suggest relevant, personalized task descriptions.
- For example:
  - If user is a "Software Developer" and says "code review", suggest description like "Review pull requests and provide feedback on code quality."
  - If user is a "Student" and says "study", suggest "Review lecture notes and prepare for upcoming exam."
  - If user is a "Manager" and says "meeting", suggest "Prepare agenda and talking points for team meeting."
- Make descriptions actionable with clear objectives when possible.

Task Creation Workflow:
- When the user wants to create a task, collect: 'title', 'description', and 'dueDate'.
- If information is missing, ASK the user and include a "pendingTask" object showing what info you have so far.
- PROACTIVELY suggest a description based on the title and user's profile.
- PROACTIVELY parse any time/date mentioned by the user.
- The "pendingTask" displays info collected and shows remaining fields to the user.
- Set "pendingTask.isComplete" to true ONLY when title is provided (title is required).
- When user confirms or you have enough info, use the CREATE action.
- You can also intuitively assign a 'priority' ('high', 'medium', 'low') based on urgency/importance.

Response Format:
You MUST ALWAYS respond with a valid JSON object. Do not include markdown formatting like \`\`\`json.
Structure:
{
  "text": "Your response message to the user",
  "suggestions": ["Option 1", "Option 2"], // Optional: suggestions for the user
  "pendingTask": { "title": "...", "description": "...", "dueDate": "ISO 8601 DateTime", "priority": "...", "isComplete": true|false }, // Optional: during task creation flow
  "relatedTask": { ... }, // Optional: existing task being discussed
  "relatedTasks": [{ ... }], // Optional: list of existing tasks
  "action": { ... } // Optional: the action to perform
}

Action Objects:
- CREATE: { "type": "CREATE", "task": { "title": "...", "description": "...", "dueDate": "ISO 8601 DateTime", "priority": "high"|"medium"|"low" } }
- UPDATE: { "type": "UPDATE", "id": "...", "updates": { ... } }
- DELETE: { "type": "DELETE", "id": "..." }
- COMPLETE: { "type": "COMPLETE", "id": "..." }
- NONE: { "type": "NONE" }

Important: 
- Always use full ISO 8601 datetime format for dueDate (with time), not just date.
- ALWAYS parse natural language dates/times and include them in pendingTask.dueDate.
- PROACTIVELY suggest descriptions based on user's profile and task context.
- Include "pendingTask" when gathering info for a new task, showing progress to user.
- Set "isComplete: true" when the title is provided (minimum required to create).
`;
};

export const GeminiService = {
  sendMessage: async (
    userMessage: string, 
    currentTasks: ITask[], 
    chatHistory: AIChatMessage[] = [],
    userProfile?: IUserProfile | null
  ): Promise<{ text: string; action?: AIChatAction; suggestions?: string[]; relatedTask?: ITask; relatedTasks?: ITask[]; pendingTask?: { title?: string; description?: string; dueDate?: string; priority?: string; isComplete: boolean } }> => {
    let attempts = 0;
    // We try up to API_KEYS.length + 1 times to ensure we cycle back to the first key if needed
    const maxAttempts = API_KEYS.length + 1;

    while (attempts < maxAttempts) {
      try {
        const genAI = getGenAIClient();
        const historyContext = chatHistory
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
          .join('\n');

        const prompt = `
${buildSystemInstruction(userProfile)}

Current Tasks:
${JSON.stringify(currentTasks, null, 2)}

Chat History:
${historyContext}

User Message: ${userMessage}
`;

        const response = await genAI.models.generateContent({
          model: getCurrentModel(),
          contents: prompt,
        });
        
        const responseText = response.text || '';
        console.log('Gemini Raw Response:', responseText);

        try {
          // Clean up markdown if present
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          
          return {
            text: parsed.text || 'I processed your request.',
            action: parsed.action,
            suggestions: parsed.suggestions,
            relatedTask: parsed.relatedTask,
            relatedTasks: parsed.relatedTasks,
            pendingTask: parsed.pendingTask
          };
        } catch (e) {
          console.error('Failed to parse Gemini JSON:', e);
          // Fallback if JSON parsing fails
          return { text: responseText };
        }
      } catch (error: any) {
        console.error('Gemini API Error:', error);
        
        // Check for rate limit error (usually 429)
        if (error.message?.includes('429') || error.status === 429 || error.toString().includes('Resource has been exhausted')) {
          console.log('Rate limit reached. Rotating key...');
          rotateKey();
          attempts++;
          
          // If we've tried all keys and rotated back to the start, allow one last try or fail
          if (attempts >= maxAttempts) {
            return { text: 'Sorry, I am currently experiencing high traffic. Please try again later.' };
          }
          continue; // Retry with new key
        }
        
        return { text: 'Sorry, I encountered an error processing your request.' };
      }
    }
    return { text: 'Sorry, I encountered an error processing your request.' };
  },

  refineTaskContent: async (title: string, description: string): Promise<{ title: string; description: string }> => {
    let attempts = 0;
    const maxAttempts = API_KEYS.length + 1;

    while (attempts < maxAttempts) {
      try {
        const genAI = getGenAIClient();
        const prompt = `
You are a helpful writing assistant.
Your task is to improve the user's task title and description.
1. Correct any grammar or spelling mistakes.
2. Make the description more descriptive and actionable if it is too brief.
3. Keep the tone professional and concise.

Input Title: "${title}"
Input Description: "${description}"

Response Format:
You MUST respond with a valid JSON object.
{
  "title": "Improved Title",
  "description": "Improved Description"
}
`;

        const response = await genAI.models.generateContent({
          model: getCurrentModel(),
          contents: prompt,
        });

        const responseText = response.text || '';
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return {
          title: parsed.title || title,
          description: parsed.description || description,
        };
      } catch (error: any) {
        console.error('Gemini Refine Error:', error);
        
        if (error.message?.includes('429') || error.status === 429 || error.toString().includes('Resource has been exhausted')) {
          console.log('Rate limit reached (Refine). Rotating key...');
          rotateKey();
          attempts++;
          if (attempts >= maxAttempts) {
             return { title, description }; // Return original if all fail
          }
          continue;
        }
        
        return { title, description }; // Return original on other errors
      }
    }
    return { title, description };
  },

  enhanceTask: async (title: string, description?: string): Promise<{ title: string; description: string }> => {
    let attempts = 0;
    const maxAttempts = API_KEYS.length + 1;

    while (attempts < maxAttempts) {
      try {
        const genAI = getGenAIClient();
        const prompt = `
You are a productivity expert. Enhance this task to make it more actionable and descriptive.

Current Task Title: "${title}"
Current Description: "${description || 'No description provided'}"

Your task:
1. Create a clearer, more specific title that describes exactly what needs to be done
2. Write a detailed description with:
   - Clear objective
   - Key steps or considerations
   - Expected outcome
3. Keep it concise but informative

Response Format (JSON only, no markdown):
{
  "title": "Enhanced clear task title",
  "description": "Detailed and actionable description with key steps"
}
`;

        const response = await genAI.models.generateContent({
          model: getCurrentModel(),
          contents: prompt,
        });

        const responseText = response.text || '';
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return {
          title: parsed.title || title,
          description: parsed.description || description || '',
        };
      } catch (error: any) {
        console.error('Gemini Enhance Error:', error);
        
        if (error.message?.includes('429') || error.status === 429 || error.toString().includes('Resource has been exhausted')) {
          console.log('Rate limit reached (Enhance). Rotating key...');
          rotateKey();
          attempts++;
          if (attempts >= maxAttempts) {
             return { title, description: description || '' };
          }
          continue;
        }
        
        return { title, description: description || '' };
      }
    }
    return { title, description: description || '' };
  },

  generateSubtasks: async (title: string): Promise<string[]> => {
    let attempts = 0;
    const maxAttempts = API_KEYS.length + 1;

    while (attempts < maxAttempts) {
      try {
        const genAI = getGenAIClient();
        const prompt = `
You are a task planning assistant.
The user has a task: "${title}".
Please generate 3 to 5 actionable subtasks to help complete this task.
Return ONLY a raw JSON array of strings.

Example: ["Step 1", "Step 2", "Step 3"]
`;

        const response = await genAI.models.generateContent({
          model: getCurrentModel(),
          contents: prompt,
        });

        const responseText = response.text || '';
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (Array.isArray(parsed)) {
          return parsed.map(String);
        }
        return [];
      } catch (error: any) {
        console.error('Gemini Subtasks Error:', error);
        if (error.message?.includes('429') || error.status === 429 || error.toString().includes('Resource has been exhausted')) {
          rotateKey();
          attempts++;
          if (attempts >= maxAttempts) return [];
          continue;
        }
        return [];
      }
    }
    return [];
  },

  sendMessageStream: async (
    userMessage: string,
    currentTasks: ITask[],
    chatHistory: AIChatMessage[] = [],
    onChunk: (chunk: string) => void,
    userProfile?: IUserProfile | null
  ): Promise<{ text: string; action?: AIChatAction; suggestions?: string[]; relatedTask?: ITask; relatedTasks?: ITask[]; pendingTask?: { title?: string; description?: string; dueDate?: string; priority?: string; isComplete: boolean } }> => {
    let attempts = 0;
    const maxAttempts = API_KEYS.length + 1;

    while (attempts < maxAttempts) {
      try {
        const genAI = getGenAIClient();
        const historyContext = chatHistory
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
          .join('\n');

        const prompt = `
${buildSystemInstruction(userProfile)}

Current Tasks:
${JSON.stringify(currentTasks, null, 2)}

Chat History:
${historyContext}

User Message: ${userMessage}
`;

        // Get the full response first, then simulate streaming
        const response = await genAI.models.generateContent({
          model: getCurrentModel(),
          contents: prompt,
        });

        const responseText = response.text || '';
        
        // Parse the JSON first to extract the text field
        let parsedText = '';
        let parsedAction;
        let parsedSuggestions;
        let parsedRelatedTask;
        let parsedRelatedTasks;
        let parsedPendingTask;
        
        try {
          // Clean up markdown if present
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          
          parsedText = parsed.text || 'I processed your request.';
          parsedAction = parsed.action;
          parsedSuggestions = parsed.suggestions;
          parsedRelatedTask = parsed.relatedTask;
          parsedRelatedTasks = parsed.relatedTasks;
          parsedPendingTask = parsed.pendingTask;
        } catch (e) {
          console.error('Failed to parse Gemini JSON:', e);
          // If parsing fails, stream the raw response
          parsedText = responseText;
        }
        
        // Stream word by word for smoother effect (like Gemini web)
        const words = parsedText.split(' ');
        for (let i = 0; i < words.length; i++) {
          const word = i === words.length - 1 ? words[i] : words[i] + ' ';
          onChunk(word);
          // Faster delay for smoother streaming (5ms per word)
          await new Promise(resolve => setTimeout(resolve, 5));
        }

        console.log('Simulated Stream Complete:', parsedText);

        return {
          text: parsedText,
          action: parsedAction,
          suggestions: parsedSuggestions,
          relatedTask: parsedRelatedTask,
          relatedTasks: parsedRelatedTasks,
          pendingTask: parsedPendingTask
        };
      } catch (error: any) {
        console.error('Gemini Stream API Error:', error);
        
        // Check for rate limit error (usually 429)
        if (error.message?.includes('429') || error.status === 429 || error.toString().includes('Resource has been exhausted')) {
          console.log('Rate limit reached. Rotating key...');
          rotateKey();
          attempts++;
          
          if (attempts >= maxAttempts) {
            return { text: 'Sorry, I am currently experiencing high traffic. Please try again later.' };
          }
          continue; // Retry with new key
        }
        
        return { text: 'Sorry, I encountered an error processing your request.' };
      }
    }
    return { text: 'Sorry, I encountered an error processing your request.' };
  },
};
