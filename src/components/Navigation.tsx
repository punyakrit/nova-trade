'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Navigation() {
  const { connected } = useWallet();

  return (
    <nav className="glass-effect border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold gradient-text">
              Nova Trade
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link 
                href="/cosmo" 
                className="text-white/80 hover:text-white transition-all duration-300 hover:scale-105 relative group"
              >
                Cosmo
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link 
                href="/transfer" 
                className="text-white/80 hover:text-white transition-all duration-300 hover:scale-105 relative group"
              >
                Transfer
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {connected && (
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400 font-medium">
                  Connected
                </span>
              </div>
            )}
            <div className="wallet-adapter-button-trigger">
              <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-violet-600 !border-0 !rounded-xl !px-6 !py-3 !font-semibold !text-white hover:!shadow-lg hover:!shadow-purple-500/25 transition-all duration-300" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
