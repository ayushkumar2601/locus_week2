/**
 * GitHub Webhook Handler for CI/CD Integration
 * Handles GitHub webhooks and triggers automated deployments
 * Mimics real CI/CD pipelines with secure handling and status updates
 */

import express from 'express';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { AgentOrchestrator } from '../agent/index.js';

const router = express.Router();

// Initialize agent orchestrator for deployments
const agentOrchestrator = new AgentOrchestrator({
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY
  },
  locusApiKey: process.env.LOCUS_API_KEY,
  locusApiUrl: process.env.LOCUS_API_URL,
  logger: console
});

// Rate limiting for webhook endpoints
const webhookRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many webhook requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Store active deployments
const activeDeployments = new Map();
const deploymentHistory = new Map();

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('GitHub webhook secret not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  const expectedBuffer = Buffer.from(`sha256=${expectedSignature}`, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');

  return expectedBuffer.length === actualBuffer.length && 
         crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Extract deployment configuration from repository
 */
async function extractDeploymentConfig(repoData: any): Promise<any> {
  const config = {
    repository: {
      name: repoData.name,
      fullName: repoData.full_name,
      url: repoData.clone_url,
      sshUrl: repoData.ssh_url,
      defaultBranch: repoData.default_branch,
      language: repoData.language,
      size: repoData.size,
      private: repoData.private
    },
    deployment: {
      environment: 'production',
      autoScale: true,
      healthCheck: true,
      ssl: true
    },
    build: {
      command: 'npm run build',
      outputDirectory: 'dist',
      nodeVersion: '18'
    },
    runtime: {
      command: 'npm start',
      port: 3000
    }
  };

  // Detect framework and adjust configuration
  if (repoData.language === 'JavaScript' || repoData.language === 'TypeScript') {
    // Check for common frameworks in package.json (would need to fetch)
    config.build.nodeVersion = '18';
  } else if (repoData.language === 'Python') {
    config.build.command = 'pip install -r requirements.txt';
    config.runtime.command = 'python app.py';
    config.runtime.port = 5000;
  } else if (repoData.language === 'Java') {
    config.build.command = 'mvn clean package';
    config.runtime.command = 'java -jar target/*.jar';
    config.runtime.port = 8080;
  }

  return config;
}

/**
 * Send deployment status back to GitHub
 */
async function updateGitHubStatus(
  repoFullName: string,
  sha: string,
  state: 'pending' | 'success' | 'error' | 'failure',
  description: string,
  targetUrl?: string
): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.warn('GitHub token not configured, skipping status update');
    return;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/statuses/${sha}`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Autonomous-Deploy-Agent/1.0'
      },
      body: JSON.stringify({
        state,
        target_url: targetUrl,
        description,
        context: 'autonomous-deploy-agent/deployment'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to update GitHub status:', error);
    } else {
      console.log(`GitHub status updated: ${state} - ${description}`);
    }
  } catch (error) {
    console.error('Error updating GitHub status:', error);
  }
}

/**
 * Create GitHub deployment
 */
async function createGitHubDeployment(
  repoFullName: string,
  sha: string,
  ref: string,
  environment: string = 'production'
): Promise<number | null> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.warn('GitHub token not configured, skipping deployment creation');
    return null;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Autonomous-Deploy-Agent/1.0'
      },
      body: JSON.stringify({
        ref,
        environment,
        description: 'Autonomous deployment via Locus API',
        auto_merge: false,
        required_contexts: []
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to create GitHub deployment:', error);
      return null;
    }

    const deployment = await response.json();
    return deployment.id;
  } catch (error) {
    console.error('Error creating GitHub deployment:', error);
    return null;
  }
}

/**
 * Update GitHub deployment status
 */
async function updateGitHubDeploymentStatus(
  repoFullName: string,
  deploymentId: number,
  state: 'pending' | 'success' | 'error' | 'failure' | 'inactive',
  description: string,
  environmentUrl?: string
): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) return;

  try {
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/deployments/${deploymentId}/statuses`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Autonomous-Deploy-Agent/1.0'
      },
      body: JSON.stringify({
        state,
        description,
        environment_url: environmentUrl,
        auto_inactive: state === 'success'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to update GitHub deployment status:', error);
    } else {
      console.log(`GitHub deployment status updated: ${state} - ${description}`);
    }
  } catch (error) {
    console.error('Error updating GitHub deployment status:', error);
  }
}

/**
 * Process deployment workflow
 */
async function processDeployment(webhookData: any): Promise<void> {
  const { repository, head_commit, ref, pusher } = webhookData;
  const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`🚀 Starting deployment for ${repository.full_name}@${head_commit.id.substr(0, 7)}`);
  
  try {
    // Create GitHub deployment
    const githubDeploymentId = await createGitHubDeployment(
      repository.full_name,
      head_commit.id,
      ref
    );

    // Update initial status
    await updateGitHubStatus(
      repository.full_name,
      head_commit.id,
      'pending',
      'Deployment started - Analyzing repository...'
    );

    if (githubDeploymentId) {
      await updateGitHubDeploymentStatus(
        repository.full_name,
        githubDeploymentId,
        'pending',
        'Analyzing repository and preparing deployment...'
      );
    }

    // Extract deployment configuration
    const deploymentConfig = await extractDeploymentConfig(repository);
    
    // Store deployment info
    const deploymentInfo = {
      id: deploymentId,
      githubDeploymentId,
      repository: repository.full_name,
      commit: head_commit.id,
      branch: ref.replace('refs/heads/', ''),
      pusher: pusher.name,
      message: head_commit.message,
      timestamp: head_commit.timestamp,
      config: deploymentConfig,
      status: 'pending',
      startTime: Date.now()
    };
    
    activeDeployments.set(deploymentId, deploymentInfo);

    // Update status - Planning phase
    await updateGitHubStatus(
      repository.full_name,
      head_commit.id,
      'pending',
      'Planning deployment infrastructure...'
    );

    // Send to planner agent
    console.log(`📋 Planning deployment for ${repository.name}...`);
    const planResult = await agentOrchestrator.planDeployment(deploymentConfig.repository.url, {
      branch: deploymentInfo.branch,
      commit: head_commit.id,
      environment: 'production',
      autoScale: true
    });

    // Update status - Deployment phase
    await updateGitHubStatus(
      repository.full_name,
      head_commit.id,
      'pending',
      'Deploying to Locus infrastructure...'
    );

    if (githubDeploymentId) {
      await updateGitHubDeploymentStatus(
        repository.full_name,
        githubDeploymentId,
        'pending',
        'Deploying application to production environment...'
      );
    }

    // Deploy via Locus API
    console.log(`🏗️ Deploying ${repository.name} via Locus API...`);
    const deployResult = await agentOrchestrator.deploy(deploymentConfig.repository.url, {
      name: repository.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      branch: deploymentInfo.branch,
      commit: head_commit.id,
      environment: 'production',
      config: planResult.config
    });

    // Update deployment info
    deploymentInfo.status = 'success';
    deploymentInfo.deployResult = deployResult;
    deploymentInfo.endTime = Date.now();
    deploymentInfo.duration = deploymentInfo.endTime - deploymentInfo.startTime;

    // Success status updates
    const deploymentUrl = deployResult.endpoints?.[0] || `https://${repository.name.toLowerCase()}.locus.dev`;
    
    await updateGitHubStatus(
      repository.full_name,
      head_commit.id,
      'success',
      `Deployment successful! Live at ${deploymentUrl}`,
      deploymentUrl
    );

    if (githubDeploymentId) {
      await updateGitHubDeploymentStatus(
        repository.full_name,
        githubDeploymentId,
        'success',
        'Application deployed successfully and is now live!',
        deploymentUrl
      );
    }

    // Move to history
    deploymentHistory.set(deploymentId, deploymentInfo);
    activeDeployments.delete(deploymentId);

    console.log(`✅ Deployment completed successfully for ${repository.full_name}`);
    console.log(`🌐 Live at: ${deploymentUrl}`);
    console.log(`⏱️ Duration: ${Math.round(deploymentInfo.duration / 1000)}s`);

  } catch (error) {
    console.error(`❌ Deployment failed for ${repository.full_name}:`, error);
    
    // Update deployment info
    const deploymentInfo = activeDeployments.get(deploymentId);
    if (deploymentInfo) {
      deploymentInfo.status = 'failed';
      deploymentInfo.error = error.message;
      deploymentInfo.endTime = Date.now();
      deploymentInfo.duration = deploymentInfo.endTime - deploymentInfo.startTime;
      
      deploymentHistory.set(deploymentId, deploymentInfo);
      activeDeployments.delete(deploymentId);
    }

    // Error status updates
    await updateGitHubStatus(
      repository.full_name,
      head_commit.id,
      'error',
      `Deployment failed: ${error.message}`
    );

    if (deploymentInfo?.githubDeploymentId) {
      await updateGitHubDeploymentStatus(
        repository.full_name,
        deploymentInfo.githubDeploymentId,
        'error',
        `Deployment failed: ${error.message}`
      );
    }
  }
}

/**
 * Main webhook endpoint
 * POST /api/github/webhook
 */
router.post('/webhook',
  webhookRateLimit,
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const signature = req.get('X-Hub-Signature-256');
      const event = req.get('X-GitHub-Event');
      const delivery = req.get('X-GitHub-Delivery');
      
      if (!signature || !event || !delivery) {
        return res.status(400).json({
          error: 'Missing required GitHub headers',
          required: ['X-Hub-Signature-256', 'X-GitHub-Event', 'X-GitHub-Delivery']
        });
      }

      // Verify webhook signature
      const payload = req.body.toString();
      if (!verifyGitHubSignature(payload, signature)) {
        console.warn(`Invalid webhook signature from ${req.ip}`);
        return res.status(401).json({
          error: 'Invalid webhook signature'
        });
      }

      const webhookData = JSON.parse(payload);
      
      console.log(`📨 GitHub webhook received: ${event} (${delivery})`);
      
      // Handle ping event
      if (event === 'ping') {
        console.log('🏓 GitHub webhook ping received');
        return res.json({
          message: 'Webhook configured successfully',
          zen: webhookData.zen
        });
      }

      // Handle push events
      if (event === 'push') {
        const { repository, ref, head_commit, pusher } = webhookData;
        
        // Skip if no commits or deleted branch
        if (!head_commit || webhookData.deleted) {
          return res.json({
            message: 'No deployment needed - no commits or branch deleted',
            skipped: true
          });
        }

        // Skip if not main/master branch (configurable)
        const targetBranches = (process.env.GITHUB_DEPLOY_BRANCHES || 'main,master').split(',');
        const branchName = ref.replace('refs/heads/', '');
        
        if (!targetBranches.includes(branchName)) {
          return res.json({
            message: `Deployment skipped - branch '${branchName}' not in target branches: ${targetBranches.join(', ')}`,
            skipped: true
          });
        }

        // Skip if commit message contains [skip ci] or [ci skip]
        if (head_commit.message.match(/\[(skip ci|ci skip)\]/i)) {
          return res.json({
            message: 'Deployment skipped - [skip ci] found in commit message',
            skipped: true
          });
        }

        console.log(`🔄 Processing push to ${repository.full_name}@${branchName}`);
        console.log(`📝 Commit: ${head_commit.message} by ${pusher.name}`);

        // Process deployment asynchronously
        processDeployment(webhookData).catch(error => {
          console.error('Async deployment processing failed:', error);
        });

        return res.json({
          message: 'Deployment initiated',
          repository: repository.full_name,
          branch: branchName,
          commit: head_commit.id.substr(0, 7),
          pusher: pusher.name
        });
      }

      // Handle pull request events (for preview deployments)
      if (event === 'pull_request') {
        const { action, pull_request, repository } = webhookData;
        
        if (action === 'opened' || action === 'synchronize') {
          console.log(`🔀 PR ${action}: ${pull_request.title} (#${pull_request.number})`);
          
          // Could implement preview deployments here
          return res.json({
            message: 'Pull request received - preview deployments not yet implemented',
            action,
            pr: pull_request.number
          });
        }
      }

      // Handle other events
      console.log(`ℹ️ Unhandled GitHub event: ${event}`);
      return res.json({
        message: `Event '${event}' received but not processed`,
        event
      });

    } catch (error) {
      console.error('GitHub webhook processing error:', error);
      
      return res.status(500).json({
        error: 'Webhook processing failed',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/github/deployments
 * List recent deployments
 */
router.get('/deployments', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  
  let deployments = Array.from(deploymentHistory.values())
    .concat(Array.from(activeDeployments.values()))
    .sort((a, b) => b.startTime - a.startTime);
  
  if (status) {
    deployments = deployments.filter(d => d.status === status);
  }
  
  deployments = deployments.slice(0, limit);
  
  return res.json({
    deployments: deployments.map(d => ({
      id: d.id,
      repository: d.repository,
      branch: d.branch,
      commit: d.commit.substr(0, 7),
      pusher: d.pusher,
      message: d.message,
      status: d.status,
      duration: d.duration ? Math.round(d.duration / 1000) : null,
      timestamp: d.timestamp,
      url: d.deployResult?.endpoints?.[0]
    })),
    total: deployments.length
  });
});

/**
 * GET /api/github/deployments/:id
 * Get specific deployment details
 */
router.get('/deployments/:id', (req, res) => {
  const { id } = req.params;
  
  const deployment = activeDeployments.get(id) || deploymentHistory.get(id);
  
  if (!deployment) {
    return res.status(404).json({
      error: 'Deployment not found',
      id
    });
  }
  
  return res.json({
    deployment: {
      ...deployment,
      commit: deployment.commit.substr(0, 7)
    }
  });
});

/**
 * POST /api/github/deployments/:id/redeploy
 * Trigger redeployment
 */
router.post('/deployments/:id/redeploy', async (req, res) => {
  const { id } = req.params;
  
  const deployment = deploymentHistory.get(id);
  
  if (!deployment) {
    return res.status(404).json({
      error: 'Deployment not found',
      id
    });
  }
  
  try {
    // Create new deployment with same config
    const newDeploymentId = `redeploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newDeployment = {
      ...deployment,
      id: newDeploymentId,
      status: 'pending',
      startTime: Date.now(),
      endTime: undefined,
      duration: undefined,
      error: undefined
    };
    
    activeDeployments.set(newDeploymentId, newDeployment);
    
    // Process redeployment
    processDeployment({
      repository: { 
        full_name: deployment.repository,
        name: deployment.repository.split('/')[1],
        clone_url: deployment.config.repository.url
      },
      head_commit: {
        id: deployment.commit,
        message: `Redeployment of ${deployment.commit.substr(0, 7)}`,
        timestamp: new Date().toISOString()
      },
      ref: `refs/heads/${deployment.branch}`,
      pusher: { name: 'system' }
    }).catch(error => {
      console.error('Redeployment failed:', error);
    });
    
    return res.json({
      message: 'Redeployment initiated',
      newDeploymentId,
      originalDeployment: id
    });
    
  } catch (error) {
    return res.status(500).json({
      error: 'Redeployment failed',
      message: error.message
    });
  }
});

/**
 * GET /api/github/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  return res.json({
    status: 'healthy',
    service: 'GitHub CI/CD Integration',
    timestamp: new Date().toISOString(),
    features: {
      webhookHandling: true,
      signatureVerification: !!process.env.GITHUB_WEBHOOK_SECRET,
      statusUpdates: !!process.env.GITHUB_TOKEN,
      deploymentCreation: !!process.env.GITHUB_TOKEN,
      agentIntegration: true
    },
    stats: {
      activeDeployments: activeDeployments.size,
      totalDeployments: deploymentHistory.size + activeDeployments.size
    }
  });
});

export default router;