"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  GamepadIcon,
  Trophy,
  User,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/config/FirebaseConfig";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { createClientUPProvider } from "@lukso/up-provider";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Define types for our data
interface GameHistory {
  quizCode: string;
  score: number;
  username: string;
  playedAt: string;
}

interface UserData {
  walletAddress: string;
  trib_point: number;
  paid_game_played: number;
  createdAt: string;
  gameHistory: GameHistory[];
}

// Add new component for not found state
const ProfileNotFound = () => {
  return (
    <div className="text-center py-12">
      <div className="bg-white rounded-xl shadow p-8 max-w-md mx-auto">
        <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Profile Not Found
        </h3>
        <p className="text-gray-500 mb-6">
          We couldn't find your profile. Please make sure you're connected with
          the correct wallet.
        </p>
        <Link
          href="/pages/dashboard"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

// Update the header section for better mobile view
const Header = () => {
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
    <div className="fixed top-20 left-0 right-0 bg-white z-50">
      <div className="border-b border-gray-200 bg-white py-3 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center">
            <Link href="/pages/dashboard" className="mr-4">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
              User Profile
            </h1>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/pages/dashboard"
              className="flex-1 sm:flex-none text-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </Link>
            <button
              className="flex-1 sm:flex-none text-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={handleClaimNFTs}
            >
              Claim NFTs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Update the wallet address display component for mobile
const WalletAddress = ({ address }: { address: string }) => {
  return (
    <span className="font-medium text-gray-900 truncate max-w-[120px] sm:max-w-full">
      {address.slice(0, 6)}...{address.slice(-4)}
    </span>
  );
};

export default function UserProfile() {
  const [provider, setProvider] = useState<any>(null);
  const [accounts, setAccounts] = useState<Array<`0x${string}`>>([]);
  const [contextAccounts, setContextAccounts] = useState<Array<`0x${string}`>>(
    []
  );
  const [profileConnected, setProfileConnected] = useState(false);

  // Add loading state and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

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

  useEffect(() => {
    async function fetchUserData() {
      if (!accounts[0]) {
        setError("Please connect your wallet to view your profile");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get main user document
        const userDoc = await getDoc(doc(db, "Trib_Player", accounts[0]));

        if (!userDoc.exists()) {
          setError("PROFILE_NOT_FOUND");
          setIsLoading(false);
          return;
        }

        // Get paid game history subcollection
        const gameHistoryRef = collection(
          db,
          "Trib_Player",
          accounts[0],
          "paid_game_history"
        );
        const gameHistorySnapshot = await getDocs(gameHistoryRef);

        const gameHistory = gameHistorySnapshot.docs.map((doc) => ({
          quizCode: doc.data().quizCode,
          score: doc.data().score,
          username: doc.data().username,
          playedAt: doc.data().playedAt.toDate().toISOString(),
        }));

        const userData: UserData = {
          walletAddress: userDoc.data().walletAddress,
          trib_point: userDoc.data().trib_point,
          paid_game_played: userDoc.data().paid_game_played,
          createdAt: userDoc.data().createdAt.toDate().toISOString(),
          gameHistory,
        };

        setUserData(userData);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load user data"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [accounts[0]]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(
    userData?.gameHistory.length || 0 / itemsPerPage
  );

  // Get current items
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems =
    userData?.gameHistory.slice(indexOfFirstItem, indexOfLastItem) || [];

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const SkeletonLoader = () => {
    return (
      <div className="animate-pulse">
        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
          <div className="bg-gray-200 px-6 py-8 text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-gray-300 mb-4" />
            <div className="h-6 bg-gray-300 w-32 mx-auto rounded" />
            <div className="mt-2 h-4 bg-gray-300 w-24 mx-auto rounded" />
          </div>
          <div className="px-6 py-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-200 w-24 rounded" />
                <div className="h-4 bg-gray-200 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl pt-32 sm:pt-40 mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {error && error !== "PROFILE_NOT_FOUND" && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4 text-sm sm:text-base">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {isLoading ? (
            <>
              <SkeletonLoader />
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded" />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : error === "PROFILE_NOT_FOUND" ? (
            <div className="lg:col-span-3">
              <ProfileNotFound />
            </div>
          ) : userData ? (
            <>
              {/* User Info Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
                  <div className="bg-[#B8B8FE] px-4 sm:px-6 py-6 sm:py-8 text-center">
                    <div className="relative mx-auto h-24 w-24 rounded-full border-4 border-white overflow-hidden mb-4">
                      <Image
                        src={"/profile.gif"}
                        //@ts-ignore
                        alt={userData?.username}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      {/* @ts-ignore */}
                      {userData?.username}
                    </h2>
                    <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-800 text-white">
                      <Trophy className="h-4 w-4 mr-1" />
                      {userData?.trib_point} Points
                    </div>
                  </div>

                  <div className="px-4 sm:px-6 py-4 sm:py-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center text-gray-600">
                          <User className="h-5 w-5 mr-2 sm:mr-3 text-blue-500 flex-shrink-0" />
                          <span className="text-sm sm:text-base">Wallet</span>
                        </div>
                        <WalletAddress address={userData.walletAddress} />
                      </div>

                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center text-gray-600">
                          <GamepadIcon className="h-5 w-5 mr-3 text-blue-500" />
                          <span>Total Games</span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {userData?.paid_game_played}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-5 w-5 mr-3 text-blue-500" />
                          <span>Joined Trib</span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {formatDate(userData?.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game History */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
                  <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-blue-500 mr-2" />
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                        Game History
                      </h3>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {/* Adjust table headers for mobile */}
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Game
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                            Username
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Score
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentItems.map((game, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                              <span className="font-medium text-blue-600">
                                {game.quizCode}
                              </span>
                              <span className="block sm:hidden text-xs text-gray-500">
                                {game.username}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                              {game.username}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Trophy className="h-3 w-3 mr-1" />
                                {game.score}
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                              {formatDate(game.playedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Update pagination for mobile */}
                  {totalPages > 1 && (
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        <div className="flex justify-between sm:hidden">
                          <button
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(prev - 1, 1))
                            }
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(prev + 1, totalPages)
                              )
                            }
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing{" "}
                              <span className="font-medium">
                                {indexOfFirstItem + 1}
                              </span>{" "}
                              to{" "}
                              <span className="font-medium">
                                {Math.min(
                                  indexOfLastItem,
                                  userData?.gameHistory.length || 0
                                )}
                              </span>{" "}
                              of{" "}
                              <span className="font-medium">
                                {userData?.gameHistory.length || 0}
                              </span>{" "}
                              results
                            </p>
                          </div>
                          <div>
                            <nav
                              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                              aria-label="Pagination"
                            >
                              <button
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.max(prev - 1, 1)
                                  )
                                }
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Previous</span>
                                <ChevronLeft className="h-5 w-5" />
                              </button>

                              {Array.from({ length: totalPages }).map(
                                (_, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setCurrentPage(index + 1)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                      currentPage === index + 1
                                        ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                    }`}
                                  >
                                    {index + 1}
                                  </button>
                                )
                              )}

                              <button
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.min(prev + 1, totalPages)
                                  )
                                }
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Next</span>
                                <ChevronRight className="h-5 w-5" />
                              </button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
