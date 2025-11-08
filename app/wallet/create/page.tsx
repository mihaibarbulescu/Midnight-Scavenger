'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, ShieldAlert, ArrowLeft, Loader2, Download } from 'lucide-react';

type CreationResult = {
  addressCount: number;
  primaryAddress: string | null;
  mnemonicExportAvailable: boolean;
  message?: string;
};

export default function CreateWallet() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressCount] = useState(200);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCreateWallet = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, count: addressCount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create wallet');
      }

      setCreationResult({
        addressCount: data.addressCount ?? 0,
        primaryAddress: data.primaryAddress ?? null,
        mnemonicExportAvailable: Boolean(data.mnemonicExportAvailable),
        message: data.message,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/wallet/load');
  };

  if (creationResult) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-8 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-yellow-900/10 to-gray-900 pointer-events-none" />
        <div className="absolute top-20 left-20 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-900/30 border-2 border-red-500/50 rounded-full mb-4 animate-pulse">
              <ShieldAlert className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Wallet Created Securely
            </h1>
            <p className="text-lg text-red-400 font-semibold">
              Mnemonic storage is locked down to server operators only
            </p>
          </div>

          {/* Warning Alert */}
          <Alert variant="error" title="Critical: Mnemonic access restricted">
            <ul className="space-y-2 mt-2">
              <li className="flex items-start gap-2">
                <span className="shrink-0">1.</span>
                <span>The mnemonic is stored encrypted on the server and is never sent to the browser.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0">2.</span>
                <span>Only an authenticated operator can retrieve it once using the provided export command.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0">3.</span>
                <span>After export, the mnemonic retrieval is permanently disabled.</span>
              </li>
            </ul>
          </Alert>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-center">Operator Export Workflow</CardTitle>
              <CardDescription className="text-center">
                Run from the server hosting this application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {creationResult.message && (
                <p className="text-center text-sm text-gray-300">{creationResult.message}</p>
              )}
              <div className="flex items-center gap-3 bg-gray-800/60 border border-gray-700 rounded-lg p-4">
                <Download className="w-6 h-6 text-yellow-400" />
                <div>
                  <p className="text-sm text-gray-300">To export the mnemonic exactly once, run:</p>
                  <code className="block mt-1 font-mono text-sm bg-black/40 px-3 py-2 rounded">npm run wallet:export</code>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                The export command requires operator confirmation and the wallet password. It will display the mnemonic once and
                then permanently disable further exports.
              </p>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardContent className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Wallet Summary</h2>
              <p className="text-sm text-gray-400">
                Derived addresses: <span className="text-white font-medium">{creationResult.addressCount}</span>
              </p>
              <p className="text-sm text-gray-400 break-all">
                Primary address: <span className="text-white font-mono">{creationResult.primaryAddress || 'Unavailable'}</span>
              </p>
              <p className="text-sm text-gray-400">
                Mnemonic export remaining:{' '}
                <span className="text-white font-medium">
                  {creationResult.mnemonicExportAvailable ? 'Available (one-time)' : 'Consumed'}
                </span>
              </p>
            </CardContent>
          </Card>

          {error && <Alert variant="error">{error}</Alert>}

          <div className="flex flex-col gap-3">
            <Button onClick={handleContinue} variant="success" size="xl" className="w-full">
              Continue to Load Wallet
            </Button>
            <p className="text-center text-sm text-gray-500">
              You'll need to enter your password to unlock the wallet
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-8 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 via-blue-900/10 to-gray-900 pointer-events-none" />
      <div className="absolute top-20 left-20 w-96 h-96 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-900/30 border-2 border-green-500/50 rounded-full mb-4">
            <Lock className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Create New Wallet
          </h1>
          <p className="text-lg text-gray-400">
            Generate a secure wallet with {addressCount} mining addresses
          </p>
        </div>

        {/* Info Alert */}
        <Alert variant="info" title="Wallet Security">
          Choose a strong password to encrypt your wallet. You'll need this password every time you
          want to access your mining addresses.
        </Alert>

        {/* Form Card */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Set Your Wallet Password</CardTitle>
            <CardDescription>
              Minimum 8 characters required for security
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-12 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && password.length < 8 && (
                <p className="text-sm text-yellow-400 flex items-center gap-1">
                  <span>⚠</span> Password must be at least 8 characters
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-12 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-400 flex items-center gap-1">
                  <span>⚠</span> Passwords do not match
                </p>
              )}
            </div>

            {error && <Alert variant="error">{error}</Alert>}
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button
              onClick={handleCreateWallet}
              disabled={loading || !password || !confirmPassword || password.length < 8 || password !== confirmPassword}
              variant="success"
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Wallet...
                </>
              ) : (
                'Create Wallet'
              )}
            </Button>

            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              size="md"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
