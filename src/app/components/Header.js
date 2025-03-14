"use client";
import Image from "next/image";
import { client } from "../client";
import { ConnectButton, darkTheme, useActiveAccount } from "thirdweb/react";
import Link from "next/link";
import wallets from "./wallet";
import React from "react";
import { db, doc, getDoc, setDoc } from "@/config/FirebaseConfig";

export default function Header() {
  const activeAccount = useActiveAccount();

  React.useEffect(() => {
    const createUserProfile = async (address) => {
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

    if (activeAccount) {
      const address = activeAccount.address;
      if (address.startsWith("0x")) {
        console.log("Wallet connected:", address);
        createUserProfile(address);
      } else {
        console.log("Invalid address format:", address);
      }
    } else {
      console.log("Wallet disconnected");
    }
  }, [activeAccount]);

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
            <ConnectButton
              client={client}
              wallets={wallets}
              theme={darkTheme({
                colors: {
                  primaryButtonBg: "hsl(226, 100%, 48%)",
                  primaryButtonText: "hsl(0, 0%, 100%)",
                  accentButtonBg: "hsl(216, 100%, 34%)",
                  connectedButtonBg: "hsl(216, 100%, 34%)",
                  connectedButtonBgHover: "hsl(216, 85%, 38%)",
                  borderColor: "hsl(237, 100%, 18%)",
                },
              })}
              connectModal={{ size: "compact" }}
            />
          </div>
        </header>
      </div>
    </>
  );
}
