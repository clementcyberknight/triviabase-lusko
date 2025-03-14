"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { database, ref, set, get } from "@/config/FirebaseConfig";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createClientUPProvider } from "@lukso/up-provider";

// Constants
const USERNAME_CONSTRAINTS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 18, // Moved max length to the constant definition
};

const THEME = {
  colors: {
    primary: "#004EF3",
    primaryHover: "#0040D0",
    background: "#EDEBFF",
    white: "#FFFFFF",
    gray: {
      50: "#F9FAFB",
      100: "#F3F4F6",
      400: "#9CA3AF",
      600: "#4B5563",
      700: "#374151",
    },
  },
  spacing: {
    base: "1rem",
    lg: "1.5rem",
  },
};

const SetUsernamePage = () => {
  const router = useRouter();
  const [selectedName, setSelectedName] = useState(""); // Define selectedName
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
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

  useEffect(() => {
    if (!profileConnected || contextAccounts.length === 0) {
      setShowWalletPrompt(true);
    } else {
      setShowWalletPrompt(false);
    }
  }, [profileConnected, contextAccounts[0]]);

  const handleInputChange = (e) => {
    const name = e.target.value;
    setSelectedName(name);
    setError(""); // Clear error on input change
  };

  const handleBack = () => {
    router.back();
  };

  const handleConfirm = async () => {
    if (!profileConnected || contextAccounts.length === 0) {
      toast.error("Connect your wallet before joining!", {
        position: "top-center",
      });
      return;
    }
    if (selectedName.length < USERNAME_CONSTRAINTS.MIN_LENGTH) {
      setError(
        `Username must be at least ${USERNAME_CONSTRAINTS.MIN_LENGTH} characters long.`
      );
      return;
    }
    if (selectedName.length > USERNAME_CONSTRAINTS.MAX_LENGTH) {
      setError(
        `Username cannot be more than ${USERNAME_CONSTRAINTS.MAX_LENGTH} characters long.`
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const freeGameCode = sessionStorage.getItem("gameCode");
      // Sanitize the username to remove spaces, convert to lowercase, and replace dots with underscores
      const sanitizedUsername = selectedName
        .trim()
        .toLowerCase()
        .replace(/\./g, "_");
      // Check if user has participated before
      const participationRef = ref(
        database,
        `free_game/participation/${freeGameCode}/${accounts[0]}`
      );

      const participationSnapshot = await get(participationRef);

      if (
        participationSnapshot.exists() &&
        participationSnapshot.val().hasParticipated === true
      ) {
        setError("You have already taken this quiz.");
        setIsLoading(false);
        return;
      }

      // set username in local storage
      localStorage.setItem("freegameusername", sanitizedUsername);
      sessionStorage.setItem("freegameusername", sanitizedUsername);

      // If username is available, proceed to set participation status
      const userParticipationRef = ref(
        database,
        `free_game/participation/${freeGameCode}/${accounts[0]}`
      );
      await set(userParticipationRef, {
        walletAddress: accounts[0],
        username: sanitizedUsername,
      });

      // Redirect to the quiz page
      router.push("/pages/free_games");
    } catch (error) {
      console.error("Error setting username:", error);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      <button
        onClick={handleBack}
        className="bg-white text-gray-600 h-14 flex items-center justify-start w-full md:hidden shadow-sm"
        aria-label="Go back"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 ml-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </button>

      <main className="flex flex-col items-center justify-center flex-grow px-4 md:px-0">
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 w-full max-w-[420px] mx-auto">
          <div className="bg-[#EDEBFF] rounded-t-lg p-4 mb-4 flex items-center justify-center">
            <div className="relative w-[202px] h-[69px]">
              <Image
                src="/icons/100$ re.png"
                alt="Quiz Prize Banner"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="space-y-4">
            {showWalletPrompt ? (
              <div className="text-center space-y-3">
                <p className="text-gray-700">
                  Please connect your wallet to continue
                </p>
                <p className="text-sm text-gray-500">
                  Use the connect button in the header above
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-700 text-center text-sm md:text-base">
                  You&apos;ve been invited to play
                </p>

                <h1 className="text-xl md:text-2xl font-semibold text-center">
                  Buildathon Quiz
                </h1>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={`Enter preferred name (${USERNAME_CONSTRAINTS.MIN_LENGTH}-${USERNAME_CONSTRAINTS.MAX_LENGTH} characters)`}
                      value={selectedName}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-200 p-3 rounded-md w-full
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                placeholder:text-gray-400 text-sm md:text-base"
                      maxLength={USERNAME_CONSTRAINTS.MAX_LENGTH}
                      aria-label="Username input"
                      aria-invalid={!!error}
                      disabled={isLoading}
                    />
                    {error && (
                      <p className="text-red-500 text-sm" role="alert">
                        {error}
                      </p>
                    )}
                  </div>

                  <button
                    className="bg-[#004EF3] text-white font-bold py-3 px-4 rounded-md w-full
                              transition duration-200 ease-in-out hover:bg-[#0040D0]
                              active:transform active:scale-[0.98]
                              disabled:opacity-50 disabled:cursor-not-allowed
                              text-sm md:text-base"
                    onClick={handleConfirm}
                    disabled={isLoading || !selectedName}
                    aria-busy={isLoading}
                  >
                    {isLoading ? "Starting..." : "Start Game"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SetUsernamePage;
