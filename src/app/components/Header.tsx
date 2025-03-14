"use client";
import Image from "next/image";
import Link from "next/link";
import React, {useState, useCallback, useEffect, } from "react";
import { db, doc, getDoc, setDoc } from "@/config/FirebaseConfig";
import { createClientUPProvider } from '@lukso/up-provider';




export default function Header() {
    const [provider, setProvider] = useState<any>(null);
    const [accounts, setAccounts] = useState<Array<`0x${string}`>>([]);
    const [contextAccounts, setContextAccounts] = useState<Array<`0x${string}`>>([]);
    const [profileConnected, setProfileConnected] = useState(false);

    // Initialize provider only on client side
    useEffect(() => {
        setProvider(createClientUPProvider());
    }, []);

    const updateConnected = useCallback(
        (_accounts: Array<`0x${string}`>, _contextAccounts: Array<`0x${string}`>) => {
            setProfileConnected(_accounts.length > 0 && _contextAccounts.length > 0);
        },
        [],
    );

    useEffect(() => {
        if (!provider) return; // Only proceed if provider is initialized

        async function init() {
            try {
                const _accounts = provider.accounts as Array<`0x${string}`>;
                setAccounts(_accounts);

                const _contextAccounts = provider.contextAccounts;
                updateConnected(_accounts, _contextAccounts);
            } catch (error) {
                console.error('Failed to initialize provider:', error);
            }
        }

        // Handle account changes
        const accountsChanged = (_accounts: Array<`0x${string}`>) => {
            setAccounts(_accounts);
            updateConnected(_accounts, contextAccounts);
        };

        const contextAccountsChanged = (_accounts: Array<`0x${string}`>) => {
            setContextAccounts(_accounts);
            updateConnected(accounts, _accounts);
        };

        init();

        // Set up event listeners
        provider.on('accountsChanged', accountsChanged);
        provider.on('contextAccountsChanged', contextAccountsChanged);

        // Cleanup listeners
        return () => {
            provider.removeListener('accountsChanged', accountsChanged);
            provider.removeListener('contextAccountsChanged', contextAccountsChanged);
        };
    }, [provider, accounts[0], contextAccounts[0], updateConnected]);





  React.useEffect(() => {
    const createUserProfile = async () => {
      // Only proceed if profile is connected
      if (!profileConnected || contextAccounts.length === 0) {
        console.log("Profile not connected");
        return;
      }

      const address = contextAccounts[0]; // Use first context account
      const userRef = doc(db, `Trib_Player/${address}`);
      const snapshot = await getDoc(userRef);

      if (!snapshot.exists()) {
        const profileData = {
          walletAddress: address,
          createdAt: new Date().toISOString(),
          trib_point: 0,
        };
        await setDoc(userRef, profileData);
        console.log("User profile created for:", address);

        // Create a leaderboard profile
        const leaderboardRef = doc(db, `leaderboard/${address}`);
        const leaderboardData = {
          walletAddress: address,
          createdAt: new Date().toISOString(),
          trib_point: 0,
        };

        await setDoc(leaderboardRef, leaderboardData);
        console.log("Leaderboard profile created for:", address);
      } else {
        console.log("User profile exists for:", address);
      }
    };

    createUserProfile();
  }, [profileConnected, contextAccounts]);

  return (
    <>
      <div className="w-full justify-center fixed z-[9999]">
        <header className="fixed top-0 left-0 right-0 bg-blue-600 p-4 flex justify-between items-center md:px-8 lg:px-16 z-20">
          <Link href="/">
            <Image
              src="/icons/logo.png"
              alt="Logo"
              className="ml-4 md:ml-20"
              width={20}
              height={20}
            />
          </Link>
          <div className="relative group">
            <button
              className="bg-[hsl(226,100%,48%)] text-[hsl(0,0%,100%)] px-6 py-3 rounded-md hover:bg-[hsl(216,85%,38%)] transition-colors duration-300"
              onClick={() => {
                console.log("Connect Profile clicked");
              }}
            >
              {profileConnected && accounts[0] ? 
                `${accounts[0].slice(0, 4)}...${accounts[0].slice(-4)}` : 
                'Connect Profile'}
            </button>
          </div>
        </header>
      </div>
    </>
  );
}
