'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  LightBulbIcon,
  CpuChipIcon,
  ServerIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface AIInsight {
  id: string
  type: 'optimization' | 'warning' | 'recommendation' | 'prediction'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  actionable: boolean
  estimatedSavings?: number
  implementationTime?: string
}

interface DeploymentAnalysis {
  deploymentId: string
  status: 'analyzing' | 'complete' | 'error'
  insights: AIInsight[]
  performance: {
    score: number
    trends: {
      responseTime: number
      errorRate: number
      throughput: number
    }
  }
  cost: {
    current: number
    optimized: number
    potentialSavings: number
  }
  security: {
    score: number
    vulnerabilities: number
    recommendations: number
  }
}

export default function InsightsPage() {
  const [selectedDeployment, setSelectedDeployment] = useState<string>('deployment-1')
  const [analysis, setAnalysis] = useState<DeploymentAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading AI insights
    setIsLoading(true)
    setTimeout(() => {
      setAnalysis({
        deploymentId: selectedDeployment,
        status: 'complete',
        insights: [
          {
            id: '1',
            type: 'optimization',
            title: 'Memory Usage Optimization',
            description: 'Your application is using 40% more memory than similar Node.js applications. Consider implementing memory pooling and optimizing object lifecycle.',
            impact: 'medium',
            confidence: 87,
            actionable: true,
            estimatedSavings: 120,
            implementationTime: '2-4 hours'
          },
          {
            id: '2',
            type: 'warning',
            title: 'Database Connection Pool Exhaustion Risk',
            description: 'Current connection pool size may be insufficient during peak traffic. Recommend increasing pool size from 10 to 25 connections.',
            impact: 'high',
            confidence: 92,
            actionable: true,
            implementationTime: '30 minutes'
          },
          {
            id: '3',
            type: 'recommendation',
            title: 'Enable Auto-Scaling',
            description: 'Traffic patterns show 3x increase during business hours. Auto-scaling could reduce costs by 35% while maintaining performance.',
            impact: 'high',
            confidence: 94,
            actionable: true,
            estimatedSavings: 280,
            implementationTime: '1 hour'
          },
          {
            id: '4',
            type: 'prediction',
            title: 'Upcoming Resource Constraints',
            description: 'Based on current growth trends, you will need additional CPU resources within 2 weeks to maintain current performance levels.',
            impact: 'medium',
            confidence: 78,
            actionable: true,
            implementationTime: '15 minutes'
          }
        ],
        performance: {
          score: 78,
          trends: {
            responseTime: -12, // 12% improvement
            errorRate: 5, // 5% increase (bad)
            throughput: 23 // 23% increase (good)
          }
        },
        cost: {
          current: 342,
          optimized: 245,
          potentialSavings: 97
        },
        security: {
          score: 85,
          vulnerabilities: 2,
          recommendations: 5
        }
      })
      setIsLoading(false)
    }, 1500)
  }, [selectedDeployment])

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'optimization':
        return <ChartBarIcon className="w-5 h-5 text-blue-400" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
      case 'recommendation':
        return <LightBulbIcon className="w-5 h-5 text-green-400" />
      case 'prediction':
        return <ClockIcon className="w-5 h-5 text-purple-400" />
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'bg-red-900/20 border-red-800 text-red-300'
      case 'high':
        return 'bg-orange-900/20 border-orange-800 text-orange-300'
      case 'medium':
        return 'bg-yellow-900/20 border-yellow-800 text-yellow-300'
      case 'low':
        return 'bg-blue-900/20 border-blue-800 text-blue-300'
      default:
        return 'bg-gray-900/20 border-gray-800 text-gray-300'
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">AI Insights</h1>
            <p className="text-gray-400 mt-1">AI-powered analysis and recommendations</p>
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Insights</h1>
          <p className="text-gray-400 mt-1">AI-powered analysis and recommendations for your deployments</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedDeployment}
            onChange={(e) => setSelectedDeployment(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="deployment-1">my-app (Production)</option>
            <option value="deployment-2">api-service (Staging)</option>
            <option value="deployment-3">frontend (Development)</option>
          </select>
          <Badge variant="success">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            AI Analysis Complete
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Performance Score</p>
                <p className="text-2xl font-bold text-white">{analysis?.performance.score}/100</p>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <div className={`text-xs px-2 py-1 rounded ${
                analysis?.performance.trends.responseTime < 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
              }`}>
                Response Time: {analysis?.performance.trends.responseTime}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Cost Optimization</p>
                <p className="text-2xl font-bold text-green-400">${analysis?.cost.potentialSavings}/mo</p>
              </div>
              <div className="p-3 bg-green-900/20 rounded-lg">
                <CpuChipIcon className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-400">
                Current: ${analysis?.cost.current}/mo → Optimized: ${analysis?.cost.optimized}/mo
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Security Score</p>
                <p className="text-2xl font-bold text-white">{analysis?.security.score}/100</p>
              </div>
              <div className="p-3 bg-purple-900/20 rounded-lg">
                <ServerIcon className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-400">
                {analysis?.security.vulnerabilities} vulnerabilities, {analysis?.security.recommendations} recommendations
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Insights</p>
                <p className="text-2xl font-bold text-white">{analysis?.insights.length}</p>
              </div>
              <div className="p-3 bg-yellow-900/20 rounded-lg">
                <LightBulbIcon className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-400">
                {analysis?.insights.filter(i => i.actionable).length} actionable recommendations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Insights List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>
                Intelligent insights based on your deployment patterns and performance data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis?.insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border ${getImpactColor(insight.impact)} transition-all duration-200 hover:scale-[1.02]`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-white">{insight.title}</h4>
                          <Badge variant={insight.impact === 'critical' ? 'error' : insight.impact === 'high' ? 'warning' : 'info'}>
                            {insight.impact}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-300 mb-3">{insight.description}</p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <div className="flex items-center space-x-1">
                            <span>Confidence:</span>
                            <span className="text-white">{insight.confidence}%</span>
                          </div>
                          {insight.estimatedSavings && (
                            <div className="flex items-center space-x-1">
                              <span>Savings:</span>
                              <span className="text-green-400">${insight.estimatedSavings}/mo</span>
                            </div>
                          )}
                          {insight.implementationTime && (
                            <div className="flex items-center space-x-1">
                              <span>Time:</span>
                              <span className="text-blue-400">{insight.implementationTime}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {insight.actionable && (
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors">
                        Apply Fix
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Performance Trends */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Trends</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Response Time</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${
                      analysis?.performance.trends.responseTime < 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {analysis?.performance.trends.responseTime}%
                    </span>
                    {analysis?.performance.trends.responseTime < 0 ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-400" />
                    ) : (
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Error Rate</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${
                      analysis?.performance.trends.errorRate < 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {analysis?.performance.trends.errorRate > 0 ? '+' : ''}{analysis?.performance.trends.errorRate}%
                    </span>
                    {analysis?.performance.trends.errorRate <= 0 ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-400" />
                    ) : (
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Throughput</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${
                      analysis?.performance.trends.throughput > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      +{analysis?.performance.trends.throughput}%
                    </span>
                    <CheckCircleIcon className="w-4 h-4 text-green-400" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                Apply All Optimizations
              </button>
              <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">
                Schedule Maintenance
              </button>
              <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">
                Export Report
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Analysis Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Last Analysis</span>
                  <span className="text-sm text-white">2 minutes ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Next Analysis</span>
                  <span className="text-sm text-white">In 28 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Analysis Frequency</span>
                  <span className="text-sm text-white">Every 30 minutes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}