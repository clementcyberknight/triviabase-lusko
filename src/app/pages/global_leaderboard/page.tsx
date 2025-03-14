"use client";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, BarChart3, Trophy } from "lucide-react";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db } from "@/config/FirebaseConfig";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { createClientUPProvider } from "@lukso/up-provider";

// Update interface to match Firestore data structure
interface Participant {
  walletAddress: string;
  trib_point: number;
  createdAt: string;
  pointadded: string;
  isWinner?: boolean;
  isCurrentUser?: boolean;
}

// Add new Skeleton component
const LeaderboardSkeleton = () => (
  <>
    {/* Winner Section Skeleton */}
    <div className="bg-blue-50 p-12 rounded-xl max-w-3xl mx-auto">
      <div className="flex items-center justify-center space-x-4">
        <div className="h-7 w-24 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-px w-12 bg-gray-400"></div>
        <div className="h-7 w-32 bg-gray-200 animate-pulse rounded"></div>
      </div>
    </div>

    {/* Participants List Skeleton */}
    <div className="divide-y divide-gray-200 bg-white rounded-b-xl">
      {[...Array(5)].map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between px-6 py-4"
        >
          <div className="h-6 w-36 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
        </div>
      ))}
    </div>
  </>
);

export default function Leaderboard() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const [provider, setProvider] = useState<any>(null);
  const [accounts, setAccounts] = useState<Array<`0x${string}`>>([]);
  const [contextAccounts, setContextAccounts] = useState<Array<`0x${string}`>>(
    []
  );
  const [profileConnected, setProfileConnected] = useState(false);

  // Initialize provider only on client side
  useEffect(() => {
    setProvider(createClientUPProvider());
  }, []);

  const updateConnected = useCallback(
    (
      _accounts: Array<`0x${string}`>,
      _contextAccounts: Array<`0x${string}`>
    ) => {
      setProfileConnected(_accounts.length > 0 && _contextAccounts.length > 0);
    },
    []
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
        console.error("Failed to initialize provider:", error);
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
    provider.on("accountsChanged", accountsChanged);
    provider.on("contextAccountsChanged", contextAccountsChanged);

    // Cleanup listeners
    return () => {
      provider.removeListener("accountsChanged", accountsChanged);
      provider.removeListener("contextAccountsChanged", contextAccountsChanged);
    };
  }, [provider, accounts[0], contextAccounts[0], updateConnected]);

  // Fetch leaderboard data from Firestore
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const leaderboardRef = collection(db, "leaderboard");
        const q = query(leaderboardRef, orderBy("trib_point", "desc"));
        const querySnapshot = await getDocs(q);

        const leaderboardData = querySnapshot.docs.map((doc, index) => ({
          ...(doc.data() as Participant),
          isWinner: index === 0,
          isCurrentUser:
            accounts[0]?.toLowerCase() ===
            doc.data().walletAddress.toLowerCase(),
        }));

        setParticipants(leaderboardData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        toast.error("Failed to load leaderboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [accounts[0]]);

  const handleClaimNFTs = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info("Coming soon!", {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <ToastContainer />
      {/* Fixed Header */}
      <div className="fixed top-20 left-0 right-0 bg-white z-50">
        <div className="border-b border-gray-200 bg-white py-4 px-4 sm:px-6 lg:px-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center">
              <Link href="/pages/dashboard" className="mr-4">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
                Global Leaderboard
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 sm:space-x-4">
              <Link
                href="/pages/dashboard"
                className="flex-1 sm:flex-none text-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={handleClaimNFTs}
                className="flex-1 sm:flex-none text-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Claim NFTs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Adjust padding for mobile */}
      <div className="pt-64 sm:pt-48">
        <div className="mx-auto max-w-4xl px-2 sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow border border-blue-500 rounded-xl">
            {/* Leaderboard Header */}
            <div className="flex items-center justify-center border-b border-gray-200 bg-white py-4 rounded-t-xl">
              <BarChart3 className="mr-2 h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-medium text-blue-500">Leaderboard</h2>
            </div>

            {loading ? (
              <LeaderboardSkeleton />
            ) : (
              <>
                {/* Winner Section */}
                {participants.length > 0 && (
                  <div className="bg-blue-50 p-4 sm:p-12 rounded-xl max-w-3xl mx-auto">
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <span className="text-lg sm:text-xl font-medium text-gray-600">
                        Trib Chief
                      </span>
                      <div className="hidden sm:block h-px w-12 bg-gray-400"></div>
                      <div className="flex items-center">
                        <span className="text-lg sm:text-xl font-semibold text-gray-800">
                          {participants[0].walletAddress.slice(0, 6)}...
                          {participants[0].walletAddress.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Participants List */}
                <div className="divide-y divide-gray-200 bg-white rounded-b-xl">
                  {participants.map((participant, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between px-3 sm:px-6 py-4 ${
                        participant.isCurrentUser ? "bg-blue-50" : ""
                      }`}
                    >
                      <span className="font-medium text-gray-800 text-sm sm:text-base">
                        {participant.walletAddress.slice(0, 6)}...
                        {participant.walletAddress.slice(-4)}
                        {participant.isCurrentUser && " (you)"}
                      </span>
                      <div className="flex items-center">
                        {participant.isWinner && (
                          <div className="mr-2 text-yellow-500">
                            <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                        )}
                        <span className="font-medium text-blue-500">
                          {participant.trib_point}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
