/**
 * Conversational Deployment Interface
 * Provides a natural language interface for deployment operations
 * Makes the system feel like talking to an AI DevOps engineer
 */

import { EventEmitter } from 'events';
import { NLPDeploymentParser } from './nlpDeploymentParser.js';

class ConversationalDeployment extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    
    // Initialize NLP parser
    this.nlpParser = new NLPDeploymentParser({
      aiProvider: options.aiProvider,
      logger: this.logger
    });
    
    // Initialize agent orchestrator (injected via options)
    this.orchestrator = options.orchestrator;
    
    // Conversation state management
    this.conversations = new Map();
    this.deploymentHistory = new Map();
    
    // Setup event handlers
    this.setupEventHandlers();
    
    this.logger.info('Conversational Deployment Interface initialized');
  }

  /**
   * Main entry point for natural language deployment
   * @param {string} userInput - Natural language deployment request
   * @param {Object} context - Conversation context
   * @returns {Object} Deployment response with conversational feedback
   */
  async processDeploymentRequest(userInput, context = {}) {
    const conversationId = context.conversationId || this.generateConversationId();
    
    try {
      this.logger.info('Processing conversational deployment request', { 
        input: userInput,
        conversationId 
      });
      
      // Get or create conversation context
      const conversation = this.getConversation(conversationId);
      conversation.messages.push({
        role: 'user',
        content: userInput,
        timestamp: Date.now()
      });
      
      // Parse the natural language request
      const parsedConfig = await this.nlpParser.parseDeploymentRequest(userInput, {
        ...context,
        conversationHistory: conversation.messages
      });
      
      // Generate conversational response
      const conversationalResponse = this.generateConversationalResponse(parsedConfig, userInput);
      
      // Add AI response to conversation
      conversation.messages.push({
        role: 'assistant',
        content: conversationalResponse.message,
        timestamp: Date.now(),
        config: parsedConfig
      });
      
      // Check if we need clarification
      if (parsedConfig.metadata.confidence < 0.7) {
        const clarification = await this.requestClarification(parsedConfig, userInput);
        return {
          type: 'clarification',
          message: clarification.message,
          questions: clarification.questions,
          parsedConfig,
          conversationId
        };
      }
      
      // Proceed with deployment
      const deploymentResult = await this.executeDeployment(parsedConfig, conversationId);
      
      return {
        type: 'deployment',
        message: conversationalResponse.message,
        deploymentResult,
        parsedConfig,
        conversationId,
        estimatedTime: this.estimateDeploymentTime(parsedConfig)
      };
      
    } catch (error) {
      this.logger.error('Conversational deployment failed', { 
        input: userInput,
        conversationId,
        error: error.message 
      });
      
      const errorResponse = this.generateErrorResponse(error, userInput);
      return {
        type: 'error',
        message: errorResponse.message,
        suggestions: errorResponse.suggestions,
        conversationId
      };
    }
  }

  /**
   * Generate conversational response based on parsed configuration
   */
  generateConversationalResponse(config, originalInput) {
    const responses = [];
    
    // Acknowledge the request
    responses.push(this.generateAcknowledgment(config, originalInput));
    
    // Describe what we understood
    responses.push(this.describeConfiguration(config));
    
    // Mention any optimizations or suggestions
    if (config.aiSuggestions) {
      responses.push(this.describeAISuggestions(config.aiSuggestions));
    }
    
    // Provide deployment timeline
    responses.push(this.describeDeploymentPlan(config));
    
    return {
      message: responses.join('\n\n'),
      tone: 'professional',
      confidence: config.metadata.confidence
    };
  }

  /**
   * Generate acknowledgment message
   */
  generateAcknowledgment(config, originalInput) {
    const acknowledgments = [
      "Got it! I'll help you deploy that application.",
      "Perfect! I understand what you want to deploy.",
      "Excellent! Let me set up that deployment for you.",
      "Great choice! I'll get that application deployed.",
      "Understood! I'll handle the deployment process."
    ];
    
    const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
    
    if (config.stack) {
      return `${randomAck} I can see you want to deploy a ${config.stack} application.`;
    }
    
    return randomAck;
  }

  /**
   * Describe the parsed configuration in natural language
   */
  describeConfiguration(config) {
    const parts = [];
    
    // Stack description
    if (config.stack) {
      parts.push(`📚 **Stack**: ${config.stack} (${config.language})`);
    }
    
    // Frontend/Backend
    if (config.frontend.length > 0) {
      parts.push(`🎨 **Frontend**: ${config.frontend.join(', ')}`);
    }
    if (config.backend.length > 0) {
      parts.push(`⚙️ **Backend**: ${config.backend.join(', ')}`);
    }
    
    // Database
    if (config.database) {
      parts.push(`🗄️ **Database**: ${config.database.type}`);
    }
    
    // Features
    if (config.features.length > 0) {
      const featureEmojis = {
        authentication: '🔐',
        api: '🔌',
        realtime: '⚡',
        file_upload: '📁',
        payment: '💳',
        email: '📧',
        analytics: '📊'
      };
      
      const featureList = config.features.map(f => 
        `${featureEmojis[f] || '✨'} ${f.replace('_', ' ')}`
      ).join(', ');
      
      parts.push(`🚀 **Features**: ${featureList}`);
    }
    
    // Infrastructure
    parts.push(`💻 **Infrastructure**: ${config.infrastructure.size} (${config.infrastructure.memory}MB RAM, ${config.infrastructure.cpu} CPU)`);
    
    // Environment
    parts.push(`🌍 **Environment**: ${config.environment} (${config.region || 'auto-selected region'})`);
    
    return "Here's what I've configured for your deployment:\n\n" + parts.join('\n');
  }

  /**
   * Describe AI suggestions
   */
  describeAISuggestions(aiSuggestions) {
    const suggestions = [];
    
    if (aiSuggestions.missingTechnologies?.length > 0) {
      suggestions.push(`🤖 **AI Suggestion**: I recommend adding ${aiSuggestions.missingTechnologies.join(', ')} for better functionality.`);
    }
    
    if (aiSuggestions.securityConsiderations?.length > 0) {
      suggestions.push(`🔒 **Security**: I'll automatically configure ${aiSuggestions.securityConsiderations.join(', ')} for security.`);
    }
    
    if (suggestions.length > 0) {
      return "💡 **AI Insights**:\n" + suggestions.join('\n');
    }
    
    return '';
  }

  /**
   * Describe deployment plan
   */
  describeDeploymentPlan(config) {
    const steps = [
      "🔍 Analyze your code and dependencies",
      "🏗️ Configure optimal infrastructure",
      "🚀 Deploy via Locus API",
      "🔍 Run health checks and monitoring"
    ];
    
    if (config.database) {
      steps.splice(2, 0, "🗄️ Set up database and connections");
    }
    
    if (config.features.includes('authentication')) {
      steps.splice(-1, 0, "🔐 Configure authentication system");
    }
    
    const estimatedTime = this.estimateDeploymentTime(config);
    
    return `📋 **Deployment Plan** (estimated ${estimatedTime}):\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\nStarting deployment now...`;
  }

  /**
   * Request clarification for ambiguous requests
   */
  async requestClarification(config, originalInput) {
    const questions = [];
    
    // Stack clarification
    if (!config.stack && config.frontend.length === 0 && config.backend.length === 0) {
      questions.push({
        type: 'stack',
        question: "What technology stack would you like to use? (e.g., MERN, Django, Rails)",
        options: ['MERN', 'MEAN', 'Django', 'Rails', 'Laravel', 'Spring Boot']
      });
    }
    
    // Database clarification
    if (!config.database && config.features.includes('authentication')) {
      questions.push({
        type: 'database',
        question: "You mentioned authentication - what database would you prefer?",
        options: ['PostgreSQL', 'MongoDB', 'MySQL', 'Let AI choose']
      });
    }
    
    // Environment clarification
    if (!config.environment) {
      questions.push({
        type: 'environment',
        question: "Which environment should I deploy to?",
        options: ['Development', 'Staging', 'Production']
      });
    }
    
    // Size clarification for complex apps
    if (config.features.length > 3 && config.infrastructure.size === 'medium') {
      questions.push({
        type: 'infrastructure',
        question: "Your app has many features - should I use larger infrastructure?",
        options: ['Keep medium', 'Use large', 'Use extra large', 'Let AI optimize']
      });
    }
    
    const message = questions.length > 0 
      ? "I need a bit more information to optimize your deployment:"
      : "I have everything I need! Proceeding with deployment...";
    
    return { message, questions };
  }

  /**
   * Execute the deployment using the agent orchestrator
   */
  async executeDeployment(config, conversationId) {
    try {
      // Convert NLP config to orchestrator format
      const deploymentConfig = this.convertToDeploymentConfig(config);
      
      // Execute deployment
      const result = await this.orchestrator.deploy(deploymentConfig.repository, deploymentConfig.options);
      
      // Store deployment in history
      this.deploymentHistory.set(result.deploymentId, {
        conversationId,
        config,
        result,
        startTime: Date.now()
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Deployment execution failed', { 
        conversationId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Convert NLP config to agent orchestrator format
   */
  convertToDeploymentConfig(config) {
    return {
      repository: config.repository || 'https://github.com/demo/sample-app', // Default for demo
      options: {
        name: config.name,
        environment: config.environment,
        stack: config.stack,
        features: config.features,
        database: config.database,
        infrastructure: config.infrastructure,
        networking: config.networking,
        security: config.security,
        monitoring: config.monitoring
      }
    };
  }

  /**
   * Generate error response with helpful suggestions
   */
  generateErrorResponse(error, originalInput) {
    const suggestions = [
      "Try being more specific about the technology stack (e.g., 'MERN stack')",
      "Mention the main features you need (e.g., 'with authentication')",
      "Specify the database type if you have a preference",
      "Let me know if this is for development or production"
    ];
    
    return {
      message: `I'm having trouble understanding your request. ${error.message}`,
      suggestions
    };
  }

  /**
   * Estimate deployment time based on configuration
   */
  estimateDeploymentTime(config) {
    let baseTime = 3; // 3 minutes base
    
    // Add time for features
    baseTime += config.features.length * 0.5;
    
    // Add time for database
    if (config.database) baseTime += 2;
    
    // Add time for complex stacks
    if (['Django', 'Rails', 'Spring'].includes(config.stack)) {
      baseTime += 2;
    }
    
    // Add time for large infrastructure
    if (config.infrastructure.size === 'large') baseTime += 1;
    if (config.infrastructure.size === 'xlarge') baseTime += 2;
    
    return `${Math.ceil(baseTime)}-${Math.ceil(baseTime * 1.5)} minutes`;
  }

  /**
   * Handle follow-up questions and clarifications
   */
  async handleFollowUp(conversationId, userResponse, questionType) {
    const conversation = this.getConversation(conversationId);
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    
    if (!lastMessage || !lastMessage.config) {
      throw new Error('No previous configuration found');
    }
    
    // Update configuration based on user response
    const updatedConfig = this.updateConfigFromResponse(lastMessage.config, questionType, userResponse);
    
    // Continue with deployment
    return await this.processDeploymentRequest(`Continue with: ${JSON.stringify(updatedConfig)}`, {
      conversationId,
      updatedConfig
    });
  }

  /**
   * Update configuration based on user clarification
   */
  updateConfigFromResponse(config, questionType, response) {
    const updated = { ...config };
    
    switch (questionType) {
      case 'stack':
        updated.stack = response;
        break;
      case 'database':
        updated.database = { type: response.toLowerCase(), required: true };
        break;
      case 'environment':
        updated.environment = response.toLowerCase();
        break;
      case 'infrastructure':
        if (response.includes('large')) {
          updated.infrastructure.size = response.includes('extra') ? 'xlarge' : 'large';
        }
        break;
    }
    
    return updated;
  }

  /**
   * Get deployment status in conversational format
   */
  async getDeploymentStatus(deploymentId, conversational = true) {
    try {
      const status = await this.orchestrator.getDeploymentStatus(deploymentId);
      
      if (!conversational) return status;
      
      return this.formatStatusConversationally(status);
      
    } catch (error) {
      return {
        message: "I'm having trouble checking the deployment status. Let me try again...",
        error: error.message
      };
    }
  }

  /**
   * Format deployment status in conversational language
   */
  formatStatusConversationally(status) {
    const statusMessages = {
      'SUCCESS': '🎉 Great news! Your deployment is live and running perfectly.',
      'DEPLOYING': '🚀 Your deployment is in progress. Everything looks good so far!',
      'FAILED': '❌ Unfortunately, the deployment encountered an issue. But don\'t worry, I can help fix it!',
      'PENDING': '⏳ Your deployment is queued and will start shortly.'
    };
    
    const message = statusMessages[status.deployment?.status] || 
      `📊 Your deployment status: ${status.deployment?.status}`;
    
    const details = [];
    
    if (status.deployment?.endpoints?.length > 0) {
      details.push(`🌐 **Live URL**: ${status.deployment.endpoints[0]}`);
    }
    
    if (status.monitoring?.status) {
      details.push(`💚 **Health**: ${status.monitoring.status}`);
    }
    
    return {
      message: details.length > 0 ? `${message}\n\n${details.join('\n')}` : message,
      status: status.deployment?.status,
      details: status
    };
  }

  // Utility methods
  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConversation(conversationId) {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        id: conversationId,
        messages: [],
        createdAt: Date.now()
      });
    }
    return this.conversations.get(conversationId);
  }

  setupEventHandlers() {
    // Forward orchestrator events with conversational context (if orchestrator is available)
    if (this.orchestrator) {
      this.orchestrator.on('workflow:completed', (data) => {
        this.emit('deployment:completed', {
          ...data,
          message: '🎉 Deployment completed successfully! Your application is now live.'
        });
      });
      
      this.orchestrator.on('workflow:failed', (data) => {
        this.emit('deployment:failed', {
          ...data,
          message: '❌ Deployment failed, but I can help you fix this issue.'
        });
      });
    }
    
    // NLP parser events
    this.nlpParser.on('parsing:completed', (data) => {
      this.emit('parsing:completed', data);
    });
  }

  /**
   * Get conversation history
   */
  getConversationHistory(conversationId) {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * List all active deployments with conversational descriptions
   */
  async listDeployments() {
    const deployments = this.orchestrator.listActiveDeployments();
    
    return deployments.map(deployment => ({
      ...deployment,
      description: this.generateDeploymentDescription(deployment)
    }));
  }

  generateDeploymentDescription(deployment) {
    return `${deployment.stack} application "${deployment.name}" deployed ${this.timeAgo(deployment.startTime)}`;
  }

  timeAgo(timestamp) {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }
}

export { ConversationalDeployment };