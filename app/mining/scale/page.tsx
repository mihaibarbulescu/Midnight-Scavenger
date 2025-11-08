'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import {
  Cpu,
  MemoryStick as Memory,
  Gauge,
  TrendingUp,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemSpecSummary {
  cpuModel: string;
  cpuCores: number;
  cpuLoad1m: number;
  totalMemoryGB: number;
  freeMemoryGB: number;
  usedMemoryGB: number;
  memoryUsagePercent: number;
  platform: string;
  arch: string;
}

interface Recommendations {
  systemTier: 'low-end' | 'entry-level' | 'mid-range' | 'high-end';
  workerThreads: {
    current: number;
    optimal: number;
    conservative: number;
    max: number;
    explanation: string;
  };
  batchSize: {
    current: number;
    optimal: number;
    conservative: number;
    max: number;
    explanation: string;
  };
  warnings: string[];
  performanceNotes: string[];
}

export default function ScalePage() {
  const router = useRouter();
  const [specs, setSpecs] = useState<SystemSpecSummary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSystemSpecs();
  }, []);

  const loadSystemSpecs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/system/specs');

      if (response.status === 401) {
        setError('Operator authentication is required to load system specifications.');
        return;
      }

      if (response.status === 404) {
        setError('System specifications are disabled for this deployment.');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setSpecs(data.specs);
        setRecommendations(data.recommendations);
      } else {
        setError(data.error || 'Failed to load system specifications');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'high-end':
        return 'text-green-400 bg-green-900/20 border-green-700/50';
      case 'mid-range':
        return 'text-blue-400 bg-blue-900/20 border-blue-700/50';
      case 'entry-level':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700/50';
      case 'low-end':
        return 'text-orange-400 bg-orange-900/20 border-orange-700/50';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-700/50';
    }
  };

  const getTierLabel = (tier: string) => {
    return tier.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
              <p className="text-lg text-gray-400">Analyzing system specifications...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !specs || !recommendations) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <Alert variant="error" className="mb-4">
            <AlertTriangle className="w-5 h-5" />
            <span>{error || 'Failed to load system specifications'}</span>
          </Alert>
          <Button onClick={loadSystemSpecs} variant="primary">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                onClick={() => router.back()}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <h1 className="text-3xl font-bold">Performance Scaling</h1>
            </div>
            <p className="text-gray-400">
              Optimize BATCH_SIZE and workerThreads based on your hardware
            </p>
          </div>
          <Button onClick={loadSystemSpecs} variant="outline">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* System Tier Badge */}
        <div className="flex justify-center">
          <div className={cn(
            'inline-flex items-center gap-3 px-6 py-3 rounded-full border',
            getTierColor(recommendations.systemTier)
          )}>
            <Zap className="w-5 h-5" />
            <span className="text-lg font-semibold">
              System Tier: {getTierLabel(recommendations.systemTier)}
            </span>
          </div>
        </div>

        {/* System Specifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cpu className="w-5 h-5 text-blue-400" />
                CPU
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Model:</span>
                <span className="font-mono text-white truncate ml-2" title={specs.cpuModel || 'Unknown'}>
                  {specs.cpuModel || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cores:</span>
                <span className="font-mono text-white">{specs.cpuCores}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Load (1m):</span>
                <span className="font-mono text-white">{specs.cpuLoad1m.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Memory className="w-5 h-5 text-purple-400" />
                Memory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total:</span>
                <span className="font-mono text-white">{specs.totalMemoryGB.toFixed(2)} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Used:</span>
                <span className="font-mono text-white">{specs.usedMemoryGB.toFixed(2)} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Free:</span>
                <span className="font-mono text-white">{specs.freeMemoryGB.toFixed(2)} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Usage:</span>
                <span className="font-mono text-white">{specs.memoryUsagePercent.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="w-5 h-5 text-green-400" />
                System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Platform:</span>
                <span className="font-mono text-white">{specs.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Architecture:</span>
                <span className="font-mono text-white">{specs.arch}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warnings */}
        {recommendations.warnings.length > 0 && (
          <div className="space-y-2">
            {recommendations.warnings.map((warning, index) => (
              <Alert
                key={index}
                variant={warning.startsWith('✅') ? 'success' : warning.startsWith('💡') ? 'info' : 'warning'}
              >
                <span>{warning}</span>
              </Alert>
            ))}
          </div>
        )}

        {/* Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Worker Threads */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-6 h-6 text-blue-400" />
                Worker Threads
              </CardTitle>
              <CardDescription>
                Number of parallel mining threads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400">Current:</span>
                  <span className="text-2xl font-bold text-white">
                    {recommendations.workerThreads.current}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-semibold">Optimal:</span>
                  </div>
                  <span className="text-2xl font-bold text-green-400">
                    {recommendations.workerThreads.optimal}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <span className="text-blue-400">Conservative:</span>
                  <span className="text-xl font-bold text-blue-400">
                    {recommendations.workerThreads.conservative}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg">
                  <span className="text-orange-400">Maximum:</span>
                  <span className="text-xl font-bold text-orange-400">
                    {recommendations.workerThreads.max}
                  </span>
                </div>
              </div>

              <Alert variant="info">
                <Info className="w-4 h-4" />
                <span className="text-sm">{recommendations.workerThreads.explanation}</span>
              </Alert>

              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Location:</strong> lib/mining/orchestrator.ts:42</p>
                <p><strong>Variable:</strong> <code className="bg-gray-800 px-1 py-0.5 rounded">private workerThreads = 12;</code></p>
              </div>
            </CardContent>
          </Card>

          {/* Batch Size */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-6 h-6 text-purple-400" />
                Batch Size
              </CardTitle>
              <CardDescription>
                Number of hashes computed per batch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400">Current:</span>
                  <span className="text-2xl font-bold text-white">
                    {recommendations.batchSize.current}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-semibold">Optimal:</span>
                  </div>
                  <span className="text-2xl font-bold text-green-400">
                    {recommendations.batchSize.optimal}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <span className="text-blue-400">Conservative:</span>
                  <span className="text-xl font-bold text-blue-400">
                    {recommendations.batchSize.conservative}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg">
                  <span className="text-orange-400">Maximum:</span>
                  <span className="text-xl font-bold text-orange-400">
                    {recommendations.batchSize.max}
                  </span>
                </div>
              </div>

              <Alert variant="info">
                <Info className="w-4 h-4" />
                <span className="text-sm">{recommendations.batchSize.explanation}</span>
              </Alert>

              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Location:</strong> lib/mining/orchestrator.ts:597</p>
                <p><strong>Variable:</strong> <code className="bg-gray-800 px-1 py-0.5 rounded">const BATCH_SIZE = 350;</code></p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Notes */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              Performance Tuning Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-300">
              {recommendations.performanceNotes.map((note, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Manual Configuration Instructions */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              How to Apply Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-4 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  1
                </span>
                <div>
                  <p className="font-semibold text-white mb-1">Stop Mining</p>
                  <p className="text-gray-400">Make sure mining is stopped before making changes</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  2
                </span>
                <div>
                  <p className="font-semibold text-white mb-1">Edit Orchestrator File</p>
                  <p className="text-gray-400 mb-2">Open: <code className="bg-gray-800 px-2 py-0.5 rounded">lib/mining/orchestrator.ts</code></p>
                  <div className="bg-gray-800 p-3 rounded-lg font-mono text-xs space-y-1">
                    <p className="text-gray-500">// Line 597</p>
                    <p className="text-green-400">const BATCH_SIZE = {recommendations.batchSize.optimal};</p>
                    <p className="text-gray-500 mt-2">// Line 42</p>
                    <p className="text-green-400">private workerThreads = {recommendations.workerThreads.optimal};</p>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  3
                </span>
                <div>
                  <p className="font-semibold text-white mb-1">Restart Application</p>
                  <p className="text-gray-400">Close and reopen the app to apply changes</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  4
                </span>
                <div>
                  <p className="font-semibold text-white mb-1">Monitor Performance</p>
                  <p className="text-gray-400">Watch hash rate, CPU usage, and error logs to ensure stability</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
