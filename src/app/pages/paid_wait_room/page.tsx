"use client";

import { useState, useEffect, useCallback } from "react";
import { database, ref, onValue, update, set } from "@/config/FirebaseConfig";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Copy } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createClientUPProvider } from "@lukso/up-provider";

export default function Home() {
  const [provider, setProvider] = useState<any>(null);
  const [accounts, setAccounts] = useState<Array<`0x${string}`>>([]);
  const [contextAccounts, setContextAccounts] = useState<Array<`0x${string}`>>(
    []
  );
  const [profileConnected, setProfileConnected] = useState(false);
  const router = useRouter();
  const [players, setPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [quizCode, setQuizCode] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [stakedAmount, setStakedAmount] = useState(0); // Dynamic staked amount state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [title, setTitle] = useState(null);
  const [shareSupported, setShareSupported] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const shareMessage = `Join my quiz game! Use code: ${quizCode}\n`;

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
    if (!accounts[0]) return;

    const quizcodeRef = ref(database, `paid_quizcode/${accounts[0]}`);

    const unsubscribeQuizCode = onValue(
      quizcodeRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const dbQuizCode = snapshot.val().quizCode;
          const storedQuizCode = sessionStorage.getItem("inviteCode");
          if (dbQuizCode !== storedQuizCode) {
            sessionStorage.setItem("inviteCode", dbQuizCode);
            localStorage.setItem("inviteCode", dbQuizCode);
            setQuizCode(dbQuizCode);
          }
        }
      },
      (error) => {
        toast.error(`Failed to fetch quiz code: ${error.message}`, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      }
    );

    return () => {
      unsubscribeQuizCode();
    };
  }, [accounts[0]]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedQuizCode = sessionStorage.getItem("inviteCode");
      setShareSupported(!!navigator.share);
      setShareUrl(`${window.location.origin}/pages/join_game`);
    }
  }, []);

  useEffect(() => {
    if (!quizCode) return;
    const quizRef = ref(database, `paid_quizzes/${quizCode}`);
    onValue(quizRef, (snapshot) => {
      if (snapshot.exists()) {
        const quizData = snapshot.val();
        setTitle(quizData.title); // Set the title from quizData
      }
    });
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedQuizCode = sessionStorage.getItem("inviteCode");
      setQuizCode(storedQuizCode);
    }
  }, []);

  useEffect(() => {
    if (!quizCode) return;

    const participantsRef = ref(
      database,
      `paid_quizzes/${quizCode}/participants`
    );
    const questionsRef = ref(database, `paid_quizzes/${quizCode}/questions`);
    const transactionDetailsRef = ref(
      database,
      `quiz_staking/${quizCode}/transactionDetails`
    );

    const unsubscribePlayers = onValue(
      participantsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const playersData = snapshot.val();
          const playersArray = Object.entries(playersData).map(
            ([username, data]) => ({
              username,
              // @ts-ignore
              score: data.score,
            })
          );
          setPlayers(playersArray);
        } else {
          setPlayers([]);
        }
      },
      (error) => {
        toast.error(`Failed to fetch players: ${error.message}`, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      }
    );

    const unsubscribeQuestions = onValue(
      questionsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setQuestions(snapshot.val());
        } else {
          setQuestions([]);
        }
      },
      (error) => {
        toast.error(`Failed to fetch questions: ${error.message}`, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      }
    );

    const unsubscribeTransactionDetails = onValue(
      transactionDetailsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const transactionDetails = snapshot.val();
          setStakedAmount(transactionDetails.amount);
        }
      },
      (error) => {
        toast.error(`Failed to fetch transaction details: ${error.message}`, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      }
    );

    return () => {
      unsubscribePlayers();
      unsubscribeQuestions();
      unsubscribeTransactionDetails();
    };
  }, [quizCode]);

  const copyPin = async () => {
    try {
      await navigator.clipboard.writeText(quizCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      toast.error(`Failed to copy PIN: ${err.message}`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "Join My Quiz Game",
        text: shareMessage,
        url: shareUrl,
      });
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const startGame = () => {
    const numb = "0";
    const gameRef = ref(database, `paid_quizzes/${quizCode}`);
    const quizCheckerRef = ref(
      database,
      `paid_quizzes/${quizCode}/quiz_checker`
    );
    set(quizCheckerRef, true);
    update(gameRef, {
      game_start: true,
      current_question: numb,
    })
      .then(() => {
        router.push("./paid_host_game_mode");
      })
      .catch((error) => {
        toast.error(`Failed to start game: ${error.message}`, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      });
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-8 px-4">
      {/* Sub-header with mobile-first design */}
      <div className="fixed top-12 mt-[30px] left-0 right-0 bg-white text-black p-5 flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center md:ml-28">
          <Image
            src="/arrowleft.svg"
            alt="back icon"
            width={19}
            height={19}
            onClick={() => router.push("/pages/dashboard")}
            className="cursor-pointer mr-4"
          />
          <Image
            src="/icons/money.svg"
            alt="money icon"
            width={25}
            height={25}
          />
          <h1 className="text-lg md:text-xl font-bold ml-4">{title}</h1>
        </div>

        {/* Desktop-only buttons */}
        <div className="hidden md:flex md:mr-28 items-center gap-4">
          <button
            onClick={handleShare}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Share link
          </button>
          <button
            onClick={startGame}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Start Game
          </button>
        </div>
      </div>

      {/* Main Content Area with mobile optimizations */}
      <div className="pt-28 pb-8">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
            {/* PIN and Rewards - Stack on mobile */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-8">
              <div className="flex items-center justify-between bg-white border border-gray-200 px-4 py-3 rounded-lg">
                <span className="text-gray-600">PIN</span>
                <div className="flex items-center gap-2">
                  <Copy
                    className=" mx-2 cursor-pointer"
                    size={16}
                    onClick={copyPin}
                  />
                  <span
                    className={`text-lg font-medium ${
                      copySuccess ? "text-green-500" : ""
                    }`}
                  >
                    {quizCode}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                <span className="text-gray-600">Rewards</span>
                <div className="flex items-center">
                  <Image
                    src="/icons/money.svg"
                    alt="paid icon"
                    width={20}
                    height={20}
                    className="mx-2"
                  />
                  <span className="text-lg font-medium">${stakedAmount}</span>
                </div>
              </div>
            </div>

            {/* Players Section - Mobile optimized */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <Image src="/player.svg" alt="players" width={24} height={24} />
                <h2 className="text-lg font-medium text-[#5E5EFF]">
                  Players {players.length}
                </h2>
              </div>
              <div className="h-[1px] bg-blue-600 mb-4 w-full" />
              <div className="space-y-2 overflow-y-auto scrollbar-hide max-h-[40vh] md:max-h-80">
                {players.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 flex items-center justify-center">
                    <div className="loader mr-2" />
                    <span>Waiting for players to join...</span>
                  </div>
                ) : (
                  players.map((player, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-white rounded-lg border-l-2 border-[#B8B8FE]"
                    >
                      <span className="font-medium">{player.username}</span>
                      <span className="bg-[#FFF7EF] text-blue-600 font-medium rounded-full px-3 py-2">
                        P{index + 1}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Questions Section - Mobile optimized */}
            <div>
              <div className="flex items-center gap-2 mb-4 justify-center">
                <Image
                  src="/question.svg"
                  alt="questions"
                  width={24}
                  height={24}
                />
                <h2 className="text-lg font-medium text-[#5E5EFF]">
                  Questions {questions.length}
                </h2>
              </div>
              <div className="h-[1px] bg-blue-600 mb-4 w-full" />
              <div className="space-y-3 overflow-y-auto scrollbar-hide max-h-[40vh] md:max-h-80">
                {questions.map((question, index) => (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white rounded-lg border-l-2 border-[#B8B8FE] gap-2"
                  >
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <span className="bg-[#FFF7EF] text-blue-600 font-medium rounded-full px-3 py-2">
                        Q{index + 1}
                      </span>
                      <span className="flex-1 break-words">
                        {question.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 self-end md:self-auto">
                      <span>Ans:</span>
                      <span>hidden</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white shadow-top md:hidden">
            <div className="flex flex-col gap-3">
              <button
                onClick={startGame}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Start Game
              </button>
              <button
                onClick={handleShare}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Share link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
