/**
 * Groq AI Client - Primary reasoning engine for autonomous agent
 * Uses Llama3-70B model for intelligent deployment decisions
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

/**
 * Send chat completion request to Groq API
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Additional options (temperature, max_tokens, etc.)
 * @returns {Promise<string>} - Response text from Groq
 */
export async function groqChat(messages, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
  }

  const requestBody = {
    model: GROQ_MODEL,
    messages: messages,
    temperature: options.temperature || 0.3,
    max_tokens: options.max_tokens || 1000,
    top_p: options.top_p || 0.9,
    stream: false
  };

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Groq API');
    }

    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('Groq API request failed:', error);
    throw error;
  }
}

/**
 * Generate AI reasoning for deployment decisions
 * @param {Object} observation - System observation data
 * @returns {Promise<Object>} - Structured reasoning response
 */
export async function generateDeploymentReasoning(observation) {
  const prompt = `You are an autonomous DevOps AI agent analyzing system state for deployment decisions.

Current System Observation:
- Active Deployments: ${observation.deployments?.length || 0}
- Recent Errors: ${observation.errors?.length || 0}
- User Requests: ${observation.userInputs?.length || 0}
- System Health: ${observation.systemHealth?.status || 'unknown'}
- Memory Usage: ${observation.resources?.memory?.percentage || 0}%

Recent Activity:
${observation.deployments?.slice(0, 3).map(d => `- ${d.name}: ${d.status}`).join('\n') || 'No recent deployments'}

Error Summary:
${observation.errors?.slice(0, 3).map(e => `- ${e.message}`).join('\n') || 'No recent errors'}

Analyze this system state and provide intelligent reasoning for next actions.

Return ONLY valid JSON in this exact format:
{
  "reasoning": ["step1", "step2", "step3"],
  "confidence": 0.85,
  "priority": "medium",
  "actions": ["deploy", "monitor", "analyze"]
}`;

  const messages = [
    {
      role: 'system',
      content: 'You are an expert DevOps AI agent. Always respond with valid JSON only.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  try {
    const response = await groqChat(messages, {
      temperature: 0.3,
      max_tokens: 800
    });

    // Parse JSON response
    const reasoning = JSON.parse(response);
    
    // Validate response structure
    if (!reasoning.reasoning || !Array.isArray(reasoning.reasoning)) {
      throw new Error('Invalid reasoning format');
    }
    
    return {
      reasoning: reasoning.reasoning,
      confidence: Math.max(0, Math.min(1, reasoning.confidence || 0.7)),
      priority: ['low', 'medium', 'high'].includes(reasoning.priority) ? reasoning.priority : 'medium',
      actions: Array.isArray(reasoning.actions) ? reasoning.actions : ['monitor']
    };
    
  } catch (error) {
    console.warn('Groq reasoning failed, using fallback:', error.message);
    
    // Fallback reasoning
    return {
      reasoning: [
        'System observation completed',
        'Analyzing deployment requirements',
        'Determining optimal actions based on current state'
      ],
      confidence: 0.6,
      priority: observation.errors?.length > 0 ? 'high' : 'medium',
      actions: observation.userInputs?.length > 0 ? ['deploy', 'monitor'] : ['monitor']
    };
  }
}

/**
 * Generate failure analysis using Groq
 * @param {Object} failureData - Failure context and logs
 * @returns {Promise<Object>} - Analysis and fix suggestions
 */
export async function analyzeFailure(failureData) {
  const prompt = `You are an expert DevOps troubleshooter analyzing a deployment failure.

Failure Context:
- Deployment ID: ${failureData.deploymentId}
- Error Type: ${failureData.type || 'unknown'}
- Status: ${failureData.status || 'failed'}

Recent Logs:
${failureData.logs?.slice(-10).map(log => `[${log.level}] ${log.message}`).join('\n') || 'No logs available'}

Error Details:
${failureData.error || 'No specific error details'}

Analyze this failure and suggest specific fixes.

Return ONLY valid JSON:
{
  "analysis": "Root cause analysis",
  "fixes": ["fix1", "fix2", "fix3"],
  "confidence": 0.8,
  "category": "build|runtime|config|network"
}`;

  const messages = [
    {
      role: 'system',
      content: 'You are an expert at diagnosing deployment failures. Always respond with valid JSON only.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  try {
    const response = await groqChat(messages, {
      temperature: 0.2,
      max_tokens: 600
    });

    return JSON.parse(response);
    
  } catch (error) {
    console.warn('Groq failure analysis failed, using fallback:', error.message);
    
    return {
      analysis: 'Deployment failure detected, applying standard recovery procedures',
      fixes: ['Restart service', 'Check configuration', 'Verify dependencies'],
      confidence: 0.5,
      category: 'runtime'
    };
  }
}

/**
 * Test Groq connection
 * @returns {Promise<boolean>} - Connection status
 */
export async function testGroqConnection() {
  try {
    const response = await groqChat([
      {
        role: 'user',
        content: 'Respond with exactly: {"status": "connected"}'
      }
    ], {
      temperature: 0,
      max_tokens: 50
    });

    const parsed = JSON.parse(response);
    return parsed.status === 'connected';
    
  } catch (error) {
    console.error('Groq connection test failed:', error);
    return false;
  }
}