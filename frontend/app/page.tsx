'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  RocketLaunchIcon,
  ServerIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface DeploymentSummary {
  total: number
  active: number
  failed: number
  deploying: number
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  uptime: string
  responseTime: number
  errorRate: number
}

interface CostSummary {
  current: number
  projected: number
  savings: number
  trend: 'up' | 'down' | 'stable'
}

export default function HomePage() {
  const [deployments, setDeployments] = useState<DeploymentSummary>({
    total: 0,
    active: 0,
    failed: 0,
    deploying: 0
  })
  
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    uptime: '99.9%',
    responseTime: 0,
    errorRate: 0
  })
  
  const [costSummary, setCostSummary] = useState<CostSummary>({
    current: 0,
    projected: 0,
    savings: 0,
    trend: 'stable'
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading dashboard data
    setTimeout(() => {
      setDeployments({
        total: 24,
        active: 18,
        failed: 2,
        deploying: 4
      })
      
      setSystemHealth({
        status: 'healthy',
        uptime: '99.9%',
        responseTime: 145,
        errorRate: 0.02
      })
      
      setCostSummary({
        current: 1247,
        projected: 1180,
        savings: 67,
        trend: 'down'
      })
      
      setIsLoading(false)
    }, 1000)
  }, [])

  const recentDeployments = [
    {
      id: 1,
      name: 'my-app',
      status: 'deployed',
      environment: 'production',
      time: '2 minutes ago',
      duration: '3m 24s'
    },
    {
      id: 2,
      name: 'api-service',
      status: 'deploying',
      environment: 'staging',
      time: '5 minutes ago',
      duration: '2m 15s'
    },
    {
      id: 3,
      name: 'frontend',
      status: 'failed',
      environment: 'development',
      time: '1 hour ago',
      duration: '1m 45s'
    },
    {
      id: 4,
      name: 'worker-service',
      status: 'deployed',
      environment: 'production',
      time: '3 hours ago',
      duration: '4m 12s'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'deploying':
        return <ClockIcon className="w-5 h-5 text-blue-400 animate-spin" />
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'deployed':
        return <Badge variant="success">Deployed</Badge>
      case 'deploying':
        return <Badge variant="info">Deploying</Badge>
      case 'failed':
        return <Badge variant="error">Failed</Badge>
      default:
        return <Badge variant="default">Unknown</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome back! Here's what's happening with your deployments.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back! Here's what's happening with your deployments.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/deploy"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-600/20"
          >
            <RocketLaunchIcon className="w-5 h-5 inline mr-2" />
            New Deployment
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Deployments</p>
                <p className="text-2xl font-bold text-white">{deployments.total}</p>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-lg">
                <ServerIcon className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <div className="text-xs px-2 py-1 bg-green-900/20 text-green-400 rounded">
                {deployments.active} active
              </div>
              <div className="text-xs px-2 py-1 bg-red-900/20 text-red-400 rounded">
                {deployments.failed} failed
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">System Health</p>
                <p className="text-2xl font-bold text-white">{systemHealth.uptime}</p>
              </div>
              <div className="p-3 bg-green-900/20 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-400">
                {systemHealth.responseTime}ms avg response • {systemHealth.errorRate}% error rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Monthly Cost</p>
                <p className="text-2xl font-bold text-white">${costSummary.current}</p>
              </div>
              <div className="p-3 bg-purple-900/20 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-green-400">
                ${costSummary.savings} savings this month
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Resource Usage</p>
                <p className="text-2xl font-bold text-white">68%</p>
              </div>
              <div className="p-3 bg-yellow-900/20 rounded-lg">
                <CpuChipIcon className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deployments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Deployments</CardTitle>
              <Link href="/apps" className="text-sm text-blue-400 hover:text-blue-300">
                View all
              </Link>
            </div>
            <CardDescription>
              Latest deployment activity across all environments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDeployments.map((deployment) => (
                <div key={deployment.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(deployment.status)}
                    <div>
                      <p className="font-medium text-white">{deployment.name}</p>
                      <p className="text-sm text-gray-400">{deployment.environment} • {deployment.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">{deployment.duration}</span>
                    {getStatusBadge(deployment.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/deploy"
                className="p-4 bg-gradient-to-r from-blue-600/20 to-green-600/20 border border-blue-600/30 rounded-lg hover:from-blue-600/30 hover:to-green-600/30 transition-all duration-200 group"
              >
                <RocketLaunchIcon className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-white">Deploy App</p>
                <p className="text-sm text-gray-400">Start new deployment</p>
              </Link>

              <Link
                href="/logs"
                className="p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-600/30 rounded-lg hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-200 group"
              >
                <ChartBarIcon className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-white">View Logs</p>
                <p className="text-sm text-gray-400">Check application logs</p>
              </Link>

              <Link
                href="/insights"
                className="p-4 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-600/30 rounded-lg hover:from-yellow-600/30 hover:to-orange-600/30 transition-all duration-200 group"
              >
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-white">AI Insights</p>
                <p className="text-sm text-gray-400">Get recommendations</p>
              </Link>

              <Link
                href="/apps"
                className="p-4 bg-gradient-to-r from-green-600/20 to-teal-600/20 border border-green-600/30 rounded-lg hover:from-green-600/30 hover:to-teal-600/30 transition-all duration-200 group"
              >
                <ServerIcon className="w-8 h-8 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-white">Manage Apps</p>
                <p className="text-sm text-gray-400">View all applications</p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Real-time status of all system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium text-white">Locus API</p>
                <p className="text-sm text-gray-400">Operational</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium text-white">AI Agents</p>
                <p className="text-sm text-gray-400">All agents active</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium text-white">Monitoring</p>
                <p className="text-sm text-gray-400">2 alerts pending</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}