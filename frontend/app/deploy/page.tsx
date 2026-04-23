'use client'

import { useState } from 'react'
import { 
  RocketLaunchIcon, 
  Cog6ToothIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface DeploymentConfig {
  buildCommand: string
  startCommand: string
  nodeVersion: string
  environment: Record<string, string>
  instances: number
  autoScale: boolean
}

export default function DeployPage() {
  const [repoUrl, setRepoUrl] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [autoDetected, setAutoDetected] = useState<DeploymentConfig | null>(null)
  const [config, setConfig] = useState<DeploymentConfig>({
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    nodeVersion: '18',
    environment: {},
    instances: 1,
    autoScale: false
  })

  const handleRepoUrlChange = async (url: string) => {
    setRepoUrl(url)
    
    // Simulate auto-detection
    if (url.includes('github.com')) {
      setTimeout(() => {
        setAutoDetected({
          buildCommand: 'npm run build',
          startCommand: 'npm start',
          nodeVersion: '18',
          environment: { NODE_ENV: 'production' },
          instances: 2,
          autoScale: true
        })
      }, 1000)
    }
  }

  const handleDeploy = async () => {
    setIsDeploying(true)
    // Simulate deployment
    setTimeout(() => {
      setIsDeploying(false)
      // Redirect to logs or apps page
    }, 3000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Deploy Application</h1>
          <p className="text-gray-400 mt-1">Deploy your application with AI-powered configuration</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="info">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
            AI Assistant Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Deploy Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Repository Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RocketLaunchIcon className="w-5 h-5 text-blue-500" />
                <span>Repository</span>
              </CardTitle>
              <CardDescription>
                Enter your GitHub repository URL to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Repository URL
                  </label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => handleRepoUrlChange(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {autoDetected && (
                  <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg animate-slide-up">
                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-green-300">Configuration Auto-Detected</h4>
                        <p className="text-sm text-green-400/80 mt-1">
                          AI has analyzed your repository and suggested optimal settings
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-gray-400">Framework:</span>
                            <Badge variant="info">Next.js</Badge>
                          </div>
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-gray-400">Build:</span>
                            <code className="px-2 py-1 bg-gray-800 rounded text-green-400">
                              {autoDetected.buildCommand}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
                    <span>Configuration</span>
                  </CardTitle>
                  <CardDescription>
                    Customize your deployment settings
                  </CardDescription>
                </div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Build Command
                  </label>
                  <input
                    type="text"
                    value={config.buildCommand}
                    onChange={(e) => setConfig({...config, buildCommand: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Command
                  </label>
                  <input
                    type="text"
                    value={config.startCommand}
                    onChange={(e) => setConfig({...config, startCommand: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {showAdvanced && (
                <div className="mt-6 space-y-4 animate-slide-up">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Node.js Version
                      </label>
                      <select
                        value={config.nodeVersion}
                        onChange={(e) => setConfig({...config, nodeVersion: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="16">Node.js 16</option>
                        <option value="18">Node.js 18</option>
                        <option value="20">Node.js 20</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Instances
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.instances}
                        onChange={(e) => setConfig({...config, instances: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="autoScale"
                      checked={config.autoScale}
                      onChange={(e) => setConfig({...config, autoScale: e.target.checked})}
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="autoScale" className="text-sm text-gray-300">
                      Enable auto-scaling
                    </label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deploy Button */}
          <div className="flex justify-end">
            <button
              onClick={handleDeploy}
              disabled={!repoUrl || isDeploying}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
            >
              {isDeploying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Deploying...</span>
                </>
              ) : (
                <>
                  <RocketLaunchIcon className="w-5 h-5" />
                  <span>Deploy Application</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300">
                    This appears to be a Next.js application with TypeScript
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300">
                    Optimal configuration detected for production deployment
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300">
                    Consider enabling auto-scaling for better performance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estimated Cost */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimated Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Compute</span>
                  <span className="text-sm text-white">$24/month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Storage</span>
                  <span className="text-sm text-white">$5/month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Bandwidth</span>
                  <span className="text-sm text-white">$3/month</span>
                </div>
                <div className="border-t border-gray-800 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white">Total</span>
                    <span className="text-lg font-bold text-green-400">$32/month</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Deployments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Deployments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'my-app', status: 'success', time: '2 hours ago' },
                  { name: 'api-service', status: 'deploying', time: '5 minutes ago' },
                  { name: 'frontend', status: 'failed', time: '1 day ago' },
                ].map((deployment, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        deployment.status === 'success' ? 'bg-green-500' :
                        deployment.status === 'deploying' ? 'bg-blue-500 animate-pulse' :
                        'bg-red-500'
                      }`}></div>
                      <span className="text-sm text-gray-300">{deployment.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{deployment.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}