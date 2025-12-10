// src/services/aiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

// Enable mock mode if explicitly requested or if no API key is present
const ENV_USE_MOCK = import.meta.env.VITE_USE_MOCK_AI === 'true';
const HAS_GOOGLE_KEY = Boolean(import.meta.env.VITE_GOOGLE_AI_API_KEY);
const USE_MOCK_DATA = ENV_USE_MOCK || !HAS_GOOGLE_KEY;

let genAI = null;
if (!USE_MOCK_DATA) {
  try {
    genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY);
  } catch (err) {
    console.warn('⚠️ Failed to initialize GoogleGenerativeAI, falling back to mock:', err);
    genAI = null;
  }
}

// Rate limiting helper
const createRateLimiter = (maxRequests = 1, windowMs = 60000) => {
  let requests = [];
  
  return async (fn) => {
    const now = Date.now();
    requests = requests.filter(time => now - time < windowMs);
    
    if (requests.length >= maxRequests) {
      const waitTime = windowMs - (now - requests[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      requests = [];
    }
    
    requests.push(Date.now());
    return fn();
  };
};

const rateLimiter = createRateLimiter(1, 60000);

// Retry logic with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if ((error.status === 429 || error.message?.includes('429')) && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};

// Mock data for development
const mockResponses = {
  suggestions: {
    subtasks: [
      "Break down the task into smaller steps",
      "Create a detailed timeline with milestones",
      "Identify dependencies and potential blockers",
      "Set specific success criteria",
      "Plan resources needed"
    ],
    estimated_time: "2-3 hours",
    priority_level: "High",
    risks: ["Resource availability", "Timeline constraints", "Technical dependencies"]
  },
  insights: {
    trends: [
      "📈 Task completion rate is increasing by 15% weekly",
      "⏰ Most tasks are completed in the morning hours",
      "📊 High-priority tasks show 80% completion rate",
      "🚀 Team productivity improving steadily"
    ],
    patterns: [
      "🎯 Tasks completed faster when broken into smaller chunks",
      "⭐ Priority tasks are consistently prioritized correctly",
      "👥 Team collaboration improves task completion time",
      "📅 Mid-week shows highest productivity"
    ],
    recommendations: [
      "✅ Schedule complex tasks during peak productivity hours",
      "✅ Break larger projects into 2-3 hour chunks",
      "✅ Implement weekly planning sessions",
      "✅ Create task dependencies to improve workflow",
      "✅ Use AI suggestions for better time estimates"
    ],
    performance_score: 85
  },
  summary: "This dashboard shows comprehensive task management metrics with improving trends. Overall system performance is strong at 85% efficiency with consistent growth in task completion rates."
};

// Humanized greeting responses
const greetings = [
  "Hey there! 👋 How can I help you with your tasks today?",
  "Hello! Great to see you. What can I assist you with?",
  "Hi! I'm here to help you manage your tasks efficiently. What's on your mind?",
  "Hey! Ready to tackle some tasks? What do you need help with?",
  "Hello friend! How's your day going? Need help with anything?",
];

// Humanized small talk responses
const smallTalk = {
  'how are you': [
    "I'm doing great, thanks for asking! More importantly, how are YOU doing? Ready to conquer those tasks? 💪",
    "I'm excellent! Feeling productive and ready to help you succeed. How about you?",
    "Doing well! Just here and ready to support you with your task management journey.",
  ],
  'thanks': [
    "You're welcome! Always happy to help. Anything else you need?",
    "No problem at all! That's what I'm here for. Let me know if you need more assistance!",
    "Happy to help! 😊 Is there anything else I can do for you?",
  ],
  'hello': greetings,
  'hi': greetings,
  'hey': greetings,
};

// Generate humanized mock response based on user message
const generateIntelligentMockResponse = (message, systemPrompt = '') => {
  const lowerMessage = message.toLowerCase().trim();
  
  // Small talk responses
  for (const [key, responses] of Object.entries(smallTalk)) {
    if (lowerMessage.includes(key) && lowerMessage.length < 50) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }
  
  // Task-related questions
  if (lowerMessage.includes('how many') || lowerMessage.includes('count') || lowerMessage.includes('total')) {
    return "📊 From the system metrics, you have a total of tasks showing strong progress. Your completion rate is excellent - keep up the great work! 🎯";
  }

  if (lowerMessage.includes('completed') || lowerMessage.includes('done') || lowerMessage.includes('finished')) {
    return "🎉 Awesome work! You've completed a significant number of tasks already! Your dedication is showing and your progress is fantastic. Keep that momentum going!";
  }

  if (lowerMessage.includes('progress') || lowerMessage.includes('status') || lowerMessage.includes("what's left")) {
    return "📈 Your progress is looking great! Based on the metrics, you're maintaining a strong 85% performance score. You're crushing your goals! Keep going! 🚀";
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('suggest') || lowerMessage.includes('advice') || lowerMessage.includes('tips')) {
    return "Sure thing! Here's what I recommend for task management:\n\n✅ Start with your most important task when you're fresh\n✅ Break big tasks into bite-sized pieces (under 2 hours)\n✅ Give yourself realistic deadlines with buffer time\n✅ Take 15-minute breaks between focused work\n✅ Celebrate your wins to stay motivated!\n\nWhat specific task would you like help with?";
  }

  if (lowerMessage.includes('priority') || lowerMessage.includes('urgent') || lowerMessage.includes('important') || lowerMessage.includes('which first')) {
    return "🎯 Great question! Here's how to prioritize:\n\n1️⃣ Tasks with tight deadlines (urgent + important)\n2️⃣ Tasks that unlock other work (blocking tasks)\n3️⃣ High-impact tasks with maximum value\n\nTackle these when you have the most energy. What task would you like to prioritize?";
  }

  if (lowerMessage.includes('time') || lowerMessage.includes('estimate') || lowerMessage.includes('how long') || lowerMessage.includes('duration')) {
    return "⏱️ For estimating task time, think about:\n\n• How complex is it? (simple/moderate/complex)\n• Have you done something similar before?\n• Do you have all the tools/resources needed?\n• What might block you or cause delays?\n\n💡 Pro tip: Add 20% buffer time just in case! Got a specific task in mind?";
  }

  if (lowerMessage.includes('stuck') || lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('struggling')) {
    return "💪 Hey, no worries! Getting stuck happens to everyone. Let's figure this out together:\n\n❓ What's the main thing blocking you?\n❓ Have you encountered this before?\n❓ What resources/people can help?\n\nShare the details and I'll help you find a path forward!";
  }

  if (lowerMessage.includes('perform') || lowerMessage.includes('score') || lowerMessage.includes('doing well') || lowerMessage.includes('how am i')) {
    return "🌟 You're doing fantastic! Your performance score is strong at 85%, which shows excellent task management. You're completing tasks efficiently and staying on track. Keep up this amazing work!";
  }

  if (lowerMessage.includes('motivat') || lowerMessage.includes('encourage') || lowerMessage.includes('inspire')) {
    const motivations = [
      "💪 You've got this! Every task you complete gets you closer to your goals. Keep pushing!",
      "🌟 Remember why you started. You're doing amazing and I believe in you!",
      "🚀 Progress over perfection! You're making real headway. Be proud of yourself!",
      "⭐ Don't underestimate the power of small wins. You're building momentum!",
      "✨ You're unstoppable! Your consistency is paying off. Keep crushing those goals!",
    ];
    return motivations[Math.floor(Math.random() * motivations.length)];
  }

  // AI Insights questions
  if (lowerMessage.includes('insight') || lowerMessage.includes('trend') || lowerMessage.includes('pattern') || lowerMessage.includes('recommend')) {
    return "📊 Based on system analysis:\n\n📈 **Trends**: Task completion rates are improving, with peak productivity in mornings\n\n🎯 **Patterns**: High-priority tasks are being handled correctly, and smaller tasks finish faster\n\n💡 **Recommendations**: \n• Schedule complex work in the morning\n• Break tasks into 2-3 hour chunks\n• Review priorities weekly\n\nWant more detailed metrics?";
  }

  // Default friendly response
  return "I'm your AI task management assistant! 🤖 You can ask me about:\n\n📊 Task metrics and progress\n✅ Task completion and tracking\n⏱️ Time estimates and planning\n🎯 Task priorities and strategies\n💡 Tips, advice, and best practices\n🚀 Motivation and encouragement\n📈 System performance and insights\n\nWhat would you like to know? Just type your question!";
};

export const aiService = {
  async generateTaskSuggestions(taskDescription) {
    try {
      console.log('🤖 Generating task suggestions for:', taskDescription);
      
      if (USE_MOCK_DATA) {
        return mockResponses.suggestions;
      }
      
      return await rateLimiter(async () => {
        return await retryWithBackoff(async () => {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          const prompt = `You are a task management expert. Given the following task description, suggest:
1. 3-5 actionable subtasks
2. Estimated time to complete
3. Priority level (High, Medium, Low)
4. Potential risks or considerations

Task: ${taskDescription}

Please format your response as JSON with fields: subtasks (array), estimated_time (string), priority_level (string), risks (array).`;
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          return JSON.parse(text);
        });
      });
    } catch (error) {
      console.error('❌ AI Service Error:', error);
      return mockResponses.suggestions;
    }
  },

  async generateInsights(data) {
    try {
      console.log('📊 Generating AI insights from data');
      
      if (USE_MOCK_DATA) {
        return mockResponses.insights;
      }
      
      return await rateLimiter(async () => {
        return await retryWithBackoff(async () => {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          const prompt = `You are a data analyst. Analyze the following task/work data and provide meaningful insights:

Data: ${JSON.stringify(data.slice(0, 10))}

Provide insights in JSON format with fields: trends (array of 4 strings), patterns (array of 4 strings), recommendations (array of 5 strings), and performance_score (number 0-100).`;
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          // Extract JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          return jsonMatch ? JSON.parse(jsonMatch[0]) : mockResponses.insights;
        });
      });
    } catch (error) {
      console.error('❌ AI Service Error:', error);
      return mockResponses.insights;
    }
  },

  async generateSummary(content) {
    try {
      console.log('📝 Generating summary');
      
      if (USE_MOCK_DATA) {
        return mockResponses.summary;
      }
      
      return await rateLimiter(async () => {
        return await retryWithBackoff(async () => {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          const prompt = `Create a concise and professional summary (2-3 sentences) of the following content for a business report:

Content: ${content}

Return only the summary text.`;
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          return text;
        });
      });
    } catch (error) {
      console.error('❌ AI Service Error:', error);
      return mockResponses.summary;
    }
  },

  async chatAssistant(message, systemPrompt = '') {
    try {
      console.log('💬 AI Chat - User:', message);
      
      if (USE_MOCK_DATA) {
        // Generate humanized, friendly mock responses
        return generateIntelligentMockResponse(message, systemPrompt);
      }
      
      return await rateLimiter(async () => {
        return await retryWithBackoff(async () => {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
          
          const finalPrompt = systemPrompt 
            ? `${systemPrompt}\n\nUser message: "${message}"\n\nRespond helpfully and conversationally.`
            : `You are a helpful AI task management assistant. User: "${message}"\n\nRespond helpfully and conversationally.`;
          
          const result = await model.generateContent(finalPrompt);
          const response = await result.response;
          const text = response.text();
          
          console.log('✅ AI Response:', text);
          return text;
        });
      });
    } catch (error) {
      console.error('❌ AI Service Error:', error);
      return "I'm having trouble connecting right now, but I'm here to help! Try again in a moment? 😊";
    }
  },

  // Alias for backward compatibility
  async chat(message, options = {}) {
    return this.chatAssistant(message, options.systemPrompt || '');
  },
};

export default aiService;