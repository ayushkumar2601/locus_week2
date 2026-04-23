'use client'

import { useState, useEffect } from 'react'
import { 
  CodeBracketIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  LinkIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

interface GitHubIntegrationProps {
  onDeploymentClick?: (deployment: Deployment) => void
}

export default function GitHubIntegration({ onDeploymentClick }: GitHubIntegrationProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    success: 0,
    failed: 0
  })

  const fetchDeployments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/github/deployments?limit=50')
      
      if (!response.ok) {
        throw new Error('Failed to fetch deployments')
      }
      
      const data = await response.json()
      setDeployments(data.deployments)
      
      // Calculate stats
      const stats = data.deployments.reduce((acc: any, dep: Deployment) => {
        acc.total++
        if (dep.status === 'pending') acc.active++
        else if (dep.status === 'success') acc.success++
        else if (dep.status === 'failed' || dep.status === 'error') acc.failed++
        return acc
      }, { total: 0, active: 0, success: 0, failed: 0 })
      
      setStats(stats)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const triggerRedeployment = async (deploymentId: string) => {
    try {
      const response = await fetch(`/api/github/deployments/${deploymentId}/redeploy`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to trigger redeployment')
      }
      
      // Refresh deployments
      await fetchDeployments()
    } catch (err) {
      console.error('Redeployment failed:', err)
    }
  }

  useEffect(() => {
    fetchDeployments()
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchDeployments, 10000) // Poll every 10 seconds
    
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'failed':
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-400" />
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-400 animate-spin" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Success</Badge>
      case 'failed':
      case 'error':
        return <Badge variant="error">Failed</Badge>
      case 'pending':
        return <Badge variant="warning">Deploying</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'N/A'
    if (duration < 60) return `${duration}s`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  if (loading && deployments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-700 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-700 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <XCircleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Failed to Load Deployments</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchDeployments}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CodeBracketIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-gray-400">Total Deployments</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-yellow-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <ClockIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.active}</div>
            <div className="text-sm text-gray-400">Active Deployments</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.success}</div>
            <div className="text-sm text-gray-400">Successful</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-red-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <XCircleIcon className="w-6 h-6 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.failed}</div>
            <div className="text-sm text-gray-400">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Deployments List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <RocketLaunchIcon className="w-5 h-5 text-blue-400" />
              <span>Recent Deployments</span>
            </CardTitle>
            <button
              onClick={fetchDeployments}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {deployments.length === 0 ? (
            <div className="text-center py-8">
              <CodeBracketIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Deployments Yet</h3>
              <p className="text-gray-500">
                Connect your GitHub repository and push code to see deployments here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(deployment.status)}
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-white">{deployment.repository}</h4>
                        <Badge variant="secondary">{deployment.branch}</Badge>
                        {getStatusBadge(deployment.status)}
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                        <span>#{deployment.commit}</span>
                        <span>by {deployment.pusher}</span>
                        <span>{formatTimestamp(deployment.timestamp)}</span>
                        {deployment.duration && (
                          <span>• {formatDuration(deployment.duration)}</span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-300 mt-1 truncate max-w-md">
                        {deployment.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {deployment.url && (
                      <a
                        href={deployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                        title="View Live Site"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </a>
                    )}
                    
                    <button
                      onClick={() => onDeploymentClick?.(deployment)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="View Details"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    
                    {deployment.status !== 'pending' && (
                      <button
                        onClick={() => triggerRedeployment(deployment.id)}
                        className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                        title="Redeploy"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>GitHub Integration Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
              <h4 className="font-medium text-blue-400 mb-2">Webhook URL</h4>
              <code className="text-sm text-gray-300 bg-gray-800 px-2 py-1 rounded">
                {window.location.origin}/api/github/webhook
              </code>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-white mb-2">Required Environment Variables</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• <code>GITHUB_WEBHOOK_SECRET</code> - Webhook secret for security</li>
                  <li>• <code>GITHUB_TOKEN</code> - GitHub personal access token</li>
                  <li>• <code>GITHUB_DEPLOY_BRANCHES</code> - Branches to deploy (default: main,master)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">Webhook Events</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• <code>push</code> - Triggers deployment on push</li>
                  <li>• <code>pull_request</code> - For preview deployments (future)</li>
                </ul>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-800">
              <h4 className="font-medium text-yellow-400 mb-2">Skip Deployment</h4>
              <p className="text-sm text-gray-300">
                Add <code>[skip ci]</code> or <code>[ci skip]</code> to your commit message to skip deployment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}