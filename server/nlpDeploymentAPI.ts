/**
 * Natural Language Deployment API
 * REST API endpoints for conversational deployment interface
 */

import dotenv from 'dotenv';
import express from 'express';
import { ConversationalDeployment } from '../agent/conversationalDeployment.js';
import { SystemOrchestrator } from '../agent/orchestrator.js';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const router = express.Router();

// Initialize System Orchestrator (central brain)
const systemOrchestrator = SystemOrchestrator.getInstance({
  locusApiKey: process.env.LOCUS_API_KEY,
  locusApiUrl: process.env.LOCUS_API_URL,
  logger: console
});

// Start the autonomous system
systemOrchestrator.startSystem().catch(console.error);

// Initialize conversational deployment system
const conversationalDeployment = new ConversationalDeployment({
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY
  },
  locusApiKey: process.env.LOCUS_API_KEY,
  locusApiUrl: process.env.LOCUS_API_URL,
  logger: console
});

// Rate limiting for NLP endpoints
const nlpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many deployment requests, please try again later.',
    retryAfter: '15 minutes'
  }
});

/**
 * POST /api/nlp/deploy
 * Process natural language deployment request through Agent Brain
 */
router.post('/deploy',
  nlpRateLimit,
  [
    body('message')
      .isString()
      .isLength({ min: 5, max: 500 })
      .withMessage('Message must be between 5 and 500 characters'),
    body('conversationId')
      .optional()
      .isString()
      .withMessage('Conversation ID must be a string'),
    body('context')
      .optional()
      .isObject()
      .withMessage('Context must be an object')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { message, conversationId, context = {} } = req.body;

      // Add user context
      const enrichedContext = {
        ...context,
        conversationId,
        userId: req.user?.id,
        timestamp: Date.now(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      };

      console.log('🧠 Processing request through System Orchestrator:', message);
      
      // CRITICAL FIX: Route through System Orchestrator instead of direct deployment
      try {
        // Parse the natural language request
        const parsedConfig = await conversationalDeployment.nlpParser.parseDeploymentRequest(
          message,
          enrichedContext
        );
        
        console.log('✅ NLP parsing successful:', {
          stack: parsedConfig.stack,
          confidence: parsedConfig.metadata.confidence
        });
        
        // Process through System Orchestrator (includes Brain)
        const deploymentResult = await systemOrchestrator.processDeploymentRequest({
          message,
          parsedConfig,
          context: enrichedContext,
          name: parsedConfig.name,
          repository: enrichedContext.repository || {
            url: 'https://github.com/example/app'
          },
          environment: enrichedContext.environment || 'production'
        });
        
        console.log('✅ System Orchestrator processing successful:', {
          planId: deploymentResult.planId,
          deploymentId: deploymentResult.deploymentId
        });
        
        return res.json({
          success: true,
          type: 'deployment',
          message: `Deployment initiated successfully through Agent Brain`,
          deploymentId: deploymentResult.deploymentId,
          planId: deploymentResult.planId,
          estimatedTime: deploymentResult.estimatedTime,
          conversationId: conversationId || `conv_${Date.now()}`,
          parsedConfig: {
            stack: parsedConfig.stack,
            backend: parsedConfig.backend,
            database: parsedConfig.database?.type,
            features: parsedConfig.features,
            confidence: parsedConfig.metadata.confidence
          },
          endpoints: deploymentResult.endpoints || [],
          brainProcessing: true,
          systemOrchestrated: true
        });
        
      } catch (processingError) {
        console.error('❌ System processing failed:', processingError);
        
        // Fallback to conversational deployment for response formatting
        const response = await conversationalDeployment.processDeploymentRequest(
          message,
          enrichedContext
        );
        
        // Format response based on type
        if (response.type === 'clarification') {
          return res.json({
            success: true,
            type: 'clarification',
            message: response.message,
            questions: response.questions,
            conversationId: response.conversationId,
            parsedConfig: response.parsedConfig,
            confidence: response.parsedConfig?.metadata?.confidence,
            brainProcessing: true,
            fallbackMode: true
          });
        }
        
        if (response.type === 'error') {
          return res.status(400).json({
            success: false,
            type: 'error',
            message: response.message,
            suggestions: response.suggestions,
            conversationId: response.conversationId,
            brainProcessing: true,
            fallbackMode: true
          });
        }
        
        // Default error response
        return res.status(500).json({
          success: false,
          error: 'Processing failed',
          message: processingError.message,
          brainProcessing: true,
          fallbackMode: true
        });
      }

    } catch (error) {
      console.error('NLP deployment request failed:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process deployment request. Please try again.',
        suggestions: [
          'Check your request format',
          'Try being more specific about your requirements',
          'Contact support if the issue persists'
        ]
      });
    }
  }
);

/**
 * POST /api/nlp/clarify
 * Handle follow-up clarification responses
 */
router.post('/clarify',
  nlpRateLimit,
  [
    body('conversationId')
      .isString()
      .withMessage('Conversation ID is required'),
    body('response')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Response must be between 1 and 200 characters'),
    body('questionType')
      .isString()
      .isIn(['stack', 'database', 'environment', 'infrastructure', 'features'])
      .withMessage('Invalid question type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { conversationId, response: userResponse, questionType } = req.body;

      const result = await conversationalDeployment.handleFollowUp(
        conversationId,
        userResponse,
        questionType
      );

      return res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('Clarification handling failed:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to process clarification',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/nlp/conversation/:conversationId
 * Get conversation history
 */
router.get('/conversation/:conversationId',
  [
    param('conversationId')
      .isString()
      .withMessage('Invalid conversation ID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { conversationId } = req.params;
      const conversation = conversationalDeployment.getConversationHistory(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      return res.json({
        success: true,
        conversation: {
          id: conversation.id,
          createdAt: conversation.createdAt,
          messageCount: conversation.messages.length,
          messages: conversation.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            hasConfig: !!msg.config
          }))
        }
      });

    } catch (error) {
      console.error('Failed to get conversation:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve conversation'
      });
    }
  }
);

/**
 * GET /api/nlp/deployments
 * List deployments with conversational descriptions
 */
router.get('/deployments',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['active', 'completed', 'failed', 'all'])
      .withMessage('Invalid status filter')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const deployments = await conversationalDeployment.listDeployments();
      const { limit = 50, status = 'all' } = req.query;

      let filteredDeployments = deployments;
      
      if (status !== 'all') {
        filteredDeployments = deployments.filter(d => d.status === status);
      }

      const limitedDeployments = filteredDeployments.slice(0, parseInt(limit as string));

      return res.json({
        success: true,
        deployments: limitedDeployments,
        total: filteredDeployments.length,
        showing: limitedDeployments.length
      });

    } catch (error) {
      console.error('Failed to list deployments:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve deployments'
      });
    }
  }
);

/**
 * GET /api/nlp/deployment/:deploymentId/status
 * Get deployment status in conversational format
 */
router.get('/deployment/:deploymentId/status',
  [
    param('deploymentId')
      .isString()
      .withMessage('Invalid deployment ID'),
    query('conversational')
      .optional()
      .isBoolean()
      .withMessage('Conversational must be a boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { deploymentId } = req.params;
      const conversational = req.query.conversational !== 'false';

      const status = await conversationalDeployment.getDeploymentStatus(
        deploymentId,
        conversational
      );

      return res.json({
        success: true,
        deploymentId,
        ...status
      });

    } catch (error) {
      console.error('Failed to get deployment status:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve deployment status',
        deploymentId: req.params.deploymentId
      });
    }
  }
);

/**
 * POST /api/nlp/parse
 * Parse natural language without triggering deployment (for testing)
 */
router.post('/parse',
  nlpRateLimit,
  [
    body('message')
      .isString()
      .isLength({ min: 5, max: 500 })
      .withMessage('Message must be between 5 and 500 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { message } = req.body;

      const parsedConfig = await conversationalDeployment.nlpParser.parseDeploymentRequest(message);

      return res.json({
        success: true,
        originalMessage: message,
        parsedConfig: {
          stack: parsedConfig.stack,
          language: parsedConfig.language,
          features: parsedConfig.features,
          database: parsedConfig.database,
          infrastructure: parsedConfig.infrastructure,
          environment: parsedConfig.environment,
          confidence: parsedConfig.metadata.confidence
        },
        confidence: parsedConfig.metadata.confidence,
        timestamp: parsedConfig.metadata.parsedAt
      });

    } catch (error) {
      console.error('NLP parsing failed:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Parsing failed',
        message: error.message,
        suggestions: [
          'Try being more specific about the technology stack',
          'Mention key features you need (auth, database, API)',
          'Specify the deployment environment if needed'
        ]
      });
    }
  }
);

/**
 * GET /api/nlp/examples
 * Get example deployment requests for users
 */
router.get('/examples', (req, res) => {
  const examples = [
    {
      category: 'Web Applications',
      examples: [
        'Deploy a MERN app with authentication and database',
        'Create a Django API with PostgreSQL and user management',
        'Launch a Next.js site with Stripe payments and analytics'
      ]
    },
    {
      category: 'APIs and Services',
      examples: [
        'Build a Rails API with Redis caching and background jobs',
        'Deploy a Flask microservice with MongoDB integration',
        'Create an Express API with JWT authentication and file uploads'
      ]
    },
    {
      category: 'Serverless and Modern',
      examples: [
        'Deploy serverless functions with database connections',
        'Launch a JAMstack site with headless CMS integration',
        'Create a GraphQL API with real-time subscriptions'
      ]
    },
    {
      category: 'Enterprise Applications',
      examples: [
        'Deploy a Spring Boot application with MySQL and monitoring',
        'Launch a Laravel app with Redis, queues, and email notifications',
        'Create a .NET Core API with SQL Server and authentication'
      ]
    }
  ];

  return res.json({
    success: true,
    examples,
    tips: [
      'Be specific about the technology stack you want to use',
      'Mention key features like authentication, payments, or real-time functionality',
      'Specify database preferences if you have them',
      'Include infrastructure requirements for large applications',
      'Mention the target environment (development, staging, production)'
    ]
  });
});

/**
 * GET /api/nlp/health
 * Health check for NLP service
 */
router.get('/health', (req, res) => {
  return res.json({
    success: true,
    service: 'Natural Language Deployment API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      nlpParsing: true,
      conversationalInterface: true,
      deploymentIntegration: true,
      aiEnhancement: !!process.env.OPENAI_API_KEY
    }
  });
});

// Error handling middleware
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('NLP API Error:', error);
  
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred in the NLP service'
  });
});

export default router;