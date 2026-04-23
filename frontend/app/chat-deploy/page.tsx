'use client'

import { useState } from 'react'
import ChatDeployment from '@/components/nlp/ChatDeployment'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  SparklesIcon,
  RocketLaunchIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function ChatDeployPage() {
  const [activeDeployments, setActiveDeployments] = useState<string[]>([])
  const [completedDeployments, setCompletedDeployments] = useState<string[]>([])

  const handleDeploymentStarted = (deploymentId: string) => {
    setActiveDeployments(prev => [...prev, deploymentId])
  }

  const handleDeploymentCompleted = (deploymentId: string) => {
    setActiveDeployments(prev => prev.filter(id => id !== deploymentId))
    setCompletedDeployments(prev => [...prev, deploymentId])
  }

  const features = [
    {
      icon: <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-400" />,
      title: "Natural Language Interface",
      description: "Just describe what you want to deploy in plain English"
    },
    {
      icon: <SparklesIcon className="w-6 h-6 text-purple-400" />,
      title: "AI-Powered Understanding",
      description: "Advanced NLP parsing with GPT-4 enhancement for complex requests"
    },
    {
      icon: <RocketLaunchIcon className="w-6 h-6 text-green-400" />,
      title: "Automatic Deployment",
      description: "From conversation to live application in minutes"
    },
    {
      icon: <LightBulbIcon className="w-6 h-6 text-yellow-400" />,
      title: "Smart Suggestions",
      description: "AI recommends optimal configurations and best practices"
    }
  ]

  const examples = [
    {
      category: "Web Applications",
      items: [
        "Deploy a MERN app with authentication and database",
        "Create a Django API with PostgreSQL and user management",
        "Launch a Next.js site with Stripe payments and analytics"
      ]
    },
    {
      category: "APIs & Services",
      items: [
        "Build a Rails API with Redis caching and background jobs",
        "Deploy a Flask microservice with MongoDB integration",
        "Create an Express API with JWT auth and file uploads"
      ]
    },
    {
      category: "Modern Stacks",
      items: [
        "Deploy serverless functions with database connections",
        "Launch a JAMstack site with headless CMS",
        "Create a GraphQL API with real-time subscriptions"
      ]
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Chat Deploy</h1>
            <p className="text-xl text-gray-400">Talk to your AI DevOps engineer</p>
          </div>
        </div>
        
        <p className="text-lg text-gray-300 max-w-3xl mx-auto">
          Deploy applications using natural language. Just describe what you want to build, 
          and our AI will understand, configure, and deploy it for you automatically.
        </p>
        
        <div className="flex items-center justify-center space-x-6">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-300">No YAML required</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-300">AI-powered configuration</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-300">Instant deployment</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <RocketLaunchIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{activeDeployments.length}</div>
            <div className="text-sm text-gray-400">Active Deployments</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">{completedDeployments.length}</div>
            <div className="text-sm text-gray-400">Completed Today</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <ClockIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">2.3 min</div>
            <div className="text-sm text-gray-400">Avg Deploy Time</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SparklesIcon className="w-5 h-5 text-purple-400" />
                <span>AI DevOps Engineer</span>
                <Badge variant="success">Online</Badge>
              </CardTitle>
              <CardDescription>
                Describe your deployment needs in natural language
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ChatDeployment
                onDeploymentStarted={handleDeploymentStarted}
                onDeploymentCompleted={handleDeploymentCompleted}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="p-2 bg-gray-800 rounded-lg">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm">{feature.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">{feature.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Example Requests</CardTitle>
              <CardDescription>
                Try these natural language deployment requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {examples.map((category, index) => (
                <div key={index}>
                  <h4 className="font-medium text-white text-sm mb-2">{category.category}</h4>
                  <div className="space-y-2">
                    {category.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="p-2 bg-gray-800 rounded text-xs text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => {
                          // This would trigger the chat input
                          const event = new CustomEvent('chatExample', { detail: item });
                          window.dispatchEvent(event);
                        }}
                      >
                        "{item}"
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">💡 Pro Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                  <span>Be specific about your technology stack (MERN, Django, etc.)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></div>
                  <span>Mention key features like authentication, payments, or real-time</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2"></div>
                  <span>Specify database preferences if you have them</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2"></div>
                  <span>Include infrastructure size for large applications</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2"></div>
                  <span>Mention target environment (dev, staging, production)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">NLP Parser</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-green-400">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">AI Enhancement</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-green-400">GPT-4 Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Locus API</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-green-400">Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Auto-Deploy</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-green-400">Ready</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}