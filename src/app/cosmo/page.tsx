'use client';

import { useState, useEffect, useRef } from 'react';
import Navigation from '@/components/Navigation';
import axios from 'axios';

interface TokenData {
  name: string;
  symbol: string;
  uri: string;
  mint: string;
}

interface TokenMetadata {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  showName?: boolean;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface EnhancedTokenData extends TokenData {
  metadata?: TokenMetadata;
  metadataLoading?: boolean;
  metadataError?: boolean;
}

export default function CosmoPage() {
  const [tokens, setTokens] = useState<EnhancedTokenData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchTokenMetadata = async (tokenData: TokenData): Promise<TokenMetadata | null> => {
    try {
      if (!tokenData.uri) return null;
      
      const response = await axios.get(tokenData.uri, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch metadata for token:', tokenData.mint, error);
      return null;
    }
  };

  const connectWebSocket = () => {
    try {
      setConnectionStatus('Connecting...');
      
      const getWebSocketUrl = () => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://55075d1c6d53.ngrok-free.app/connect';
        
        if (typeof window !== 'undefined') {
          const isHttps = window.location.protocol === 'https:';
          if (isHttps && wsUrl.startsWith('ws://')) {
            return wsUrl.replace('ws://', 'wss://');
          }
        }
        
        return wsUrl;
      };
      
      const wsUrl = getWebSocketUrl();
      console.log('Attempting to connect to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('Connected');
        console.log('WebSocket connected to:', wsUrl);
      };

      ws.onmessage = async (event) => {
        try {
          const tokenData: TokenData = JSON.parse(event.data);
          const enhancedToken: EnhancedTokenData = {
            ...tokenData,
            metadataLoading: true,
            metadataError: false
          };
          
          setTokens(prevTokens => [enhancedToken, ...prevTokens]);
          
          const metadata = await fetchTokenMetadata(tokenData);
          
          setTokens(prevTokens => 
            prevTokens.map(token => 
              token.mint === tokenData.mint 
                ? { 
                    ...token, 
                    metadata: metadata || undefined, 
                    metadataLoading: false,
                    metadataError: !metadata
                  }
                : token
            )
          );
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        console.log('WebSocket disconnected');
        
        setTimeout(() => {
          if (!isConnected) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('Connection Error');
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionStatus('Failed to connect');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-12">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text">
                Cosmo - Live Token Feed
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm text-white/80 font-medium">
                {connectionStatus} to WebSocket
              </span>
            </div>
            <div className="h-4 w-px bg-white/20"></div>
            <span className="text-sm text-white/60">
              {tokens.length>100 ? 100+ '+' : tokens.length} tokens received
            </span>
          </div>
        </div>

        {tokens.length === 0 ? (
          <div className="text-center py-20">
            <div className="animate-pulse-slow">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-white/60 text-lg">Waiting for new tokens...</p>
              <p className="text-white/40 text-sm mt-2">Tokens will appear here as they are created on Solana</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tokens.map((token) => (
              <div
                key={token.mint}
                className="group relative glass-effect rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all duration-300 overflow-hidden hover:scale-105"
              >
                <div className="relative">
                  {token.metadataLoading ? (
                    <div className="w-full h-48 bg-gradient-to-br from-purple-500/10 to-violet-600/10 animate-pulse flex items-center justify-center">
                      <div className="text-white/40 flex items-center space-x-2">
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Loading image...</span>
                      </div>
                    </div>
                  ) : token.metadata?.image ? (
                    <img
                      src={token.metadata.image}
                      alt={token.metadata.name || token.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  
                  {(!token.metadata?.image || token.metadataError) && (
                    <div className="w-full h-48 bg-gradient-to-br from-purple-500/20 to-violet-600/20 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500/30 to-violet-600/30 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                          <span className="text-2xl">🪙</span>
                        </div>
                        <p className="text-white/60 text-sm">No Image</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4">
                    <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      NEW
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {token.metadata?.name || token.name || 'Unnamed Token'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-violet-600/20 text-purple-300 text-sm font-medium rounded-full border border-purple-500/30">
                          {token.metadata?.symbol || token.symbol || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {token.metadata?.description && (
                    <p className="text-white/70 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {token.metadata.description}
                    </p>
                  )}
                  
                  <div className="space-y-3 mb-6">
                    <div className="text-xs text-white/60">
                      <span className="font-medium text-white/80">Mint:</span>{' '}
                      <code className="bg-white/10 px-2 py-1 rounded text-xs text-purple-300 border border-white/10">
                        {formatAddress(token.mint)}
                      </code>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-3">
                      {token.metadata?.twitter && (
                        <a
                          href={token.metadata.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/60 hover:text-white transition-colors hover:scale-110"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                          </svg>
                        </a>
                      )}
                      {token.metadata?.telegram && (
                        <a
                          href={token.metadata.telegram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/60 hover:text-white transition-colors hover:scale-110"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                          </svg>
                        </a>
                      )}
                      {token.metadata?.website && (
                        <a
                          href={token.metadata.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/60 hover:text-white transition-colors hover:scale-110"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                    
                    <div className="text-xs text-white/40">
                      {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
