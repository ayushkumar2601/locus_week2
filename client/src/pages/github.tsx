'use client'

import { useState } from 'react'
import GitHubIntegration from '@/components/github/GitHubIntegration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CodeBracketIcon,
  RocketLaunchIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'

interface Deployment {
  id: string
  repository: string
  branch: string
  commit: string
  pusher: string
  message: string
  status: 'pending' | 'success' | 'failed' | 'error'
  duration: number | null
  timestamp: string
  url?: string
}

export default function GitHubPage() {
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null)
  const [showSetup, setShowSetup] = useState(false)

  const handleDeploymentClick = (deployment: Deployment) => {
    setSelectedDeployment(deployment)
  }

  const features = [
    {
      icon: <CodeBracketIcon className="w-6 h-6 text-blue-400" />,
      title: "Automatic Deployments",
      description: "Push to main branch triggers instant deployment via Locus API"
    },
    {
      icon: <RocketLaunchIcon className="w-6 h-6 text-green-400" />,
      title: "Smart Repository Analysis",
      description: "Automatically detects framework and configures optimal deployment"
    },
    {
      icon: <CheckCircleIcon className="w-6 h-6 text-purple-400" />,
      title: "GitHub Status Integration",
      description: "Real-time deployment status updates directly in GitHub"
    },
    {
      icon: <Cog6ToothIcon className="w-6 h-6 text-yellow-400" />,
      title: "Zero Configuration",
      description: "Works out of the box with intelligent defaults for popular frameworks"
    }
  ]

  const setupSteps = [
    {
      step: 1,
      title: "Generate GitHub Token",
      description: "Create a personal access token with repo and deployment permissions",
      action: "Go to GitHub Settings → Developer settings → Personal access tokens"
    },
    {
      step: 2,
      title: "Configure Environment Variables",
      description: "Set up the required environment variables in your deployment",
      code: `GITHUB_TOKEN=your_github_token_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_DEPLOY_BRANCHES=main,master`
    },
    {
      step: 3,
      title: "Add Webhook to Repository",
      description: "Configure webhook in your GitHub repository settings",
      details: {
        url: `${window.location.origin}/api/github/webhook`,
        contentType: "application/json",
        events: ["push", "pull_request"]
      }
    },
    {
      step: 4,
      title: "Push Code",
      description: "Push to your main branch to trigger the first deployment",
      action: "git push origin main"
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
            <CodeBracketIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">GitHub CI/CD</h1>
            <p className="text-xl text-gray-400">Automated deployments from GitHub</p>
          </div>
        </div>
        
        <p className="text-lg text-gray-300 max-w-3xl mx-auto">
          Connect your GitHub repositories for automatic deployments. Push code and watch it deploy 
          instantly with intelligent framework detection and optimal configuration.
        </p>
        
        <div className="flex items-center justify-center space-x-6">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-300">Automatic deployments</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-300">Framework detection</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-300">Status updates</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setShowSetup(!showSetup)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <Cog6ToothIcon className="w-5 h-5" />
          <span>{showSetup ? 'Hide Setup' : 'Setup Guide'}</span>
        </button>
        
        <a
          href="https://docs.github.com/en/developers/webhooks-and-events/webhooks"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <DocumentTextIcon className="w-5 h-5" />
          <span>GitHub Docs</span>
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
        </a>
      </div>

      {/* Setup Guide */}
      {showSetup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cog6ToothIcon className="w-5 h-5 text-blue-400" />
              <span>GitHub Integration Setup</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {setupSteps.map((step) => (
                <div key={step.step} className="flex space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {step.step}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-2">{step.title}</h3>
                    <p className="text-gray-400 mb-3">{step.description}</p>
                    
                    {step.code && (
                      <pre className="bg-gray-800 p-3 rounded text-sm text-gray-300 overflow-x-auto">
                        <code>{step.code}</code>
                      </pre>
                    )}
                    
                    {step.details && (
                      <div className="bg-gray-800 p-3 rounded">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Webhook URL:</span>
                            <code className="block text-blue-400 mt-1">{step.details.url}</code>
                          </div>
                          <div>
                            <span className="text-gray-400">Content Type:</span>
                            <code className="block text-green-400 mt-1">{step.details.contentType}</code>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-gray-400">Events:</span>
                            <div className="flex space-x-2 mt-1">
                              {step.details.events.map((event) => (
                                <Badge key={event} variant="secondary">{event}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {step.action && (
                      <div className="mt-2 text-sm text-blue-400">
                        💡 {step.action}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <Card key={index}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                {feature.icon}
              </div>
              <h3 className="font-medium text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Integration Component */}
      <GitHubIntegration onDeploymentClick={handleDeploymentClick} />

      {/* Deployment Details Modal */}
      {selectedDeployment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <RocketLaunchIcon className="w-5 h-5 text-blue-400" />
                  <span>Deployment Details</span>
                </CardTitle>
                <button
                  onClick={() => setSelectedDeployment(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-400">Repository</span>
                    <p className="font-medium text-white">{selectedDeployment.repository}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Branch</span>
                    <p className="font-medium text-white">{selectedDeployment.branch}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Commit</span>
                    <p className="font-medium text-white">#{selectedDeployment.commit}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Pusher</span>
                    <p className="font-medium text-white">{selectedDeployment.pusher}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Status</span>
                    <div className="flex items-center space-x-2 mt-1">
                      {selectedDeployment.status === 'success' && <CheckCircleIcon className="w-4 h-4 text-green-400" />}
                      {(selectedDeployment.status === 'failed' || selectedDeployment.status === 'error') && <XCircleIcon className="w-4 h-4 text-red-400" />}
                      {selectedDeployment.status === 'pending' && <ClockIcon className="w-4 h-4 text-yellow-400 animate-spin" />}
                      <span className="font-medium text-white capitalize">{selectedDeployment.status}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Duration</span>
                    <p className="font-medium text-white">
                      {selectedDeployment.duration ? `${selectedDeployment.duration}s` : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-400">Commit Message</span>
                  <p className="font-medium text-white mt-1">{selectedDeployment.message}</p>
                </div>
                
                {selectedDeployment.url && (
                  <div>
                    <span className="text-sm text-gray-400">Live URL</span>
                    <a
                      href={selectedDeployment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-400 hover:text-blue-300 transition-colors mt-1"
                    >
                      {selectedDeployment.url}
                    </a>
                  </div>
                )}
                
                <div className="flex space-x-3 pt-4">
                  {selectedDeployment.url && (
                    <a
                      href={selectedDeployment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      <span>View Live</span>
                    </a>
                  )}
                  
                  <button
                    onClick={() => setSelectedDeployment(null)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}