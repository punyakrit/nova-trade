'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import Navigation from '@/components/Navigation';
import toast from 'react-hot-toast';
import axios from 'axios';

const RPC_ENDPOINT = `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;

export default function TransferPage() {
  const { publicKey, sendTransaction, connected, disconnect } = useWallet();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [showUSD, setShowUSD] = useState(false);
  const [solPrice, setSolPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{amount?: string; recipient?: string}>({});
  const [mounted, setMounted] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchSolPrice();
    // Initialize connection
    setConnection(new Connection(RPC_ENDPOINT, 'confirmed'));
  }, []);

  // Refresh connection when wallet connects/disconnects
  useEffect(() => {
    if (connected && publicKey) {
      setConnection(new Connection(RPC_ENDPOINT, 'confirmed'));
    }
  }, [connected, publicKey]);

  const fetchSolPrice = async () => {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      setSolPrice(response.data.solana.usd);
    } catch (error) {
      console.error('Failed to fetch SOL price:', error);
    }
  };

  const validateSolAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const validateAmount = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    
    if (value && !validateAmount(value)) {
      setErrors(prev => ({ ...prev, amount: 'Please enter a valid amount' }));
    } else {
      setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRecipient(value);
    
    if (value && !validateSolAddress(value)) {
      setErrors(prev => ({ ...prev, recipient: 'Please enter a valid Solana address' }));
    } else {
      setErrors(prev => ({ ...prev, recipient: undefined }));
    }
  };

  const handleTransfer = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!amount || !recipient) {
      toast.error('Please fill in all fields');
      return;
    }

    if (errors.amount || errors.recipient) {
      toast.error('Please fix the validation errors');
      return;
    }

    if (isLoading) {
      return; // Prevent multiple simultaneous transactions
    }

    setIsLoading(true);

    try {
      if (!connection) {
        throw new Error('Connection not initialized');
      }

      const recipientPubkey = new PublicKey(recipient);
      const amountInLamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

      // Check if user has enough balance
      const balance = await connection.getBalance(publicKey);
      if (balance < amountInLamports) {
        toast.error('Insufficient balance');
        return;
      }

      // Get fresh blockhash for each transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: publicKey,
      });

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: amountInLamports,
        })
      );

      // Send transaction with proper options
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });
      
      // Wait for confirmation with proper timeout
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      toast.success(`Transaction sent successfully! Signature: ${signature.slice(0, 8)}...`);
      
      // Clear form after successful transaction
      setAmount('');
      setRecipient('');
      setErrors({});
      
    } catch (error: unknown) {
      console.error('Transfer failed:', error);
      
      let errorMessage = 'Transfer failed';
      
      const errorMessageStr = error instanceof Error ? error.message : String(error);
      
      if (errorMessageStr.includes('User rejected') || errorMessageStr.includes('User declined')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (errorMessageStr.includes('Insufficient')) {
        errorMessage = 'Insufficient balance';
      } else if (errorMessageStr.includes('Invalid')) {
        errorMessage = 'Invalid transaction parameters';
      } else if (errorMessageStr.includes('Blockhash not found')) {
        errorMessage = 'Transaction expired, please try again';
      } else if (errorMessageStr.includes('429')) {
        errorMessage = 'Too many requests, please wait and try again';
      } else if (errorMessageStr.includes('Unexpected error') || errorMessageStr.includes('StandardWalletAdapter')) {
        errorMessage = 'Wallet connection issue. Please try disconnecting and reconnecting your wallet.';
        // Suggest wallet reconnection
        setTimeout(() => {
          if (confirm('Would you like to disconnect and reconnect your wallet to fix this issue?')) {
            disconnect();
          }
        }, 2000);
      } else if (errorMessageStr) {
        errorMessage = `Transfer failed: ${errorMessageStr}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const usdValue = showUSD && solPrice ? (parseFloat(amount) * solPrice).toFixed(2) : null;

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-2xl mx-auto px-6 py-8">
          <div className="glass-effect rounded-2xl border border-white/10 p-8">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-2xl mx-auto mb-4"></div>
                <div className="h-8 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-lg mb-2"></div>
                <div className="h-4 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-lg w-2/3 mx-auto"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="glass-effect rounded-2xl border border-white/10 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Transfer SOL
            </h1>
            <p className="text-white/60">Send SOL tokens securely with real-time conversion</p>
          </div>

          {!connected && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 mb-8">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-yellow-200">
                  Please connect your Phantom wallet to send SOL transfers.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-white/90 mb-3">
                Amount (in SOL)
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.0"
                step="0.000000001"
                className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 ${
                  errors.amount ? 'border-red-500' : 'border-white/20'
                }`}
                disabled={!connected}
              />
              {errors.amount && (
                <p className="mt-2 text-sm text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.amount}
                </p>
              )}
              {usdValue && (
                <p className="mt-2 text-sm text-purple-300 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  ≈ ${usdValue} USD
                </p>
              )}
            </div>

            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-white/90 mb-3">
                To Wallet Address
              </label>
              <input
                type="text"
                id="recipient"
                value={recipient}
                onChange={handleRecipientChange}
                placeholder="Enter Solana wallet address"
                className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 ${
                  errors.recipient ? 'border-red-500' : 'border-white/20'
                }`}
                disabled={!connected}
              />
              {errors.recipient && (
                <p className="mt-2 text-sm text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.recipient}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="showUSD"
                checked={showUSD}
                onChange={(e) => setShowUSD(e.target.checked)}
                className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-white/20 rounded bg-white/10"
                disabled={!connected}
              />
              <label htmlFor="showUSD" className="text-sm text-white/80">
                Show USD value
              </label>
            </div>

            <button
              onClick={handleTransfer}
              disabled={!connected || isLoading || !amount || !recipient || !!errors.amount || !!errors.recipient}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white py-4 px-6 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Send SOL</span>
                </>
              )}
            </button>
          </div>

          {connected && publicKey && (
            <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl">
              <h3 className="text-sm font-medium text-white/90 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Your Wallet
              </h3>
              <p className="text-sm text-white/70 break-all font-mono">
                {publicKey.toString()}
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm text-white/70">
                Current SOL Price: <span className="text-purple-300 font-semibold">${solPrice.toFixed(2)} USD</span>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
