"use client";

import { useState, useEffect } from "react";
import { database, ref, onValue, update, set } from "@/config/FirebaseConfig";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Copy } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [players, setPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [quizCode, setQuizCode] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [title, setTitle] = useState(null);
  const [shareSupported, setShareSupported] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const shareMessage = `Join my quiz game! Use code: ${quizCode}\n`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedQuizCode = sessionStorage.getItem("inviteCode");
      setQuizCode(storedQuizCode);
      setShareSupported(!!navigator.share);
      setShareUrl(`${window.location.origin}/pages/join_game`);
    }
  }, []);

  useEffect(() => {
    if (!quizCode) return;
    const quizRef = ref(database, `quizzes/${quizCode}`);
    onValue(quizRef, (snapshot) => {
      if (snapshot.exists()) {
        const quizData = snapshot.val();
        setTitle(quizData.title); // Set the title from quizData
      }
    });

    const participantsRef = ref(database, `quizzes/${quizCode}/participants`);
    const questionsRef = ref(database, `quizzes/${quizCode}/questions`);

    const unsubscribePlayers = onValue(participantsRef, (snapshot) => {
      if (snapshot.exists()) {
        const playersData = snapshot.val();
        const playersArray = Object.entries(playersData).map(
          ([username, data]) => ({
            username,
            score: data.score,
          })
        );
        setPlayers(playersArray);
      } else {
        setPlayers([]);
      }
    });

    const unsubscribeQuestions = onValue(questionsRef, (snapshot) => {
      if (snapshot.exists()) {
        setQuestions(snapshot.val());
      } else {
        setQuestions([]);
      }
    });

    return () => {
      unsubscribePlayers();
      unsubscribeQuestions();
    };
  }, [quizCode]);

  const copyPin = async () => {
    try {
      await navigator.clipboard.writeText(quizCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy PIN:", err);
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
    const gameRef = ref(database, `quizzes/${quizCode}`);
    const quizCheckerRef = ref(database, `quizzes/${quizCode}/quiz_checker`);
    set(quizCheckerRef, true);
    update(gameRef, {
      game_start: true,
      current_question: numb,
    })
      .then(() => {
        router.push("./host_game_mode");
      })
      .catch((error) => {
        console.error("Error starting game:", error);
      });
  };

  const handleDeleteGame = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteGame = async () => {
    try {
      sessionStorage.removeItem("inviteCode");
      localStorage.removeItem("inviteCode");
      router.push("/");
    } catch (error) {
      console.error("Error deleting game:", error);
    } finally {
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-8 px-4">
      {/* Sub-header with mobile-first design */}
      <div className="fixed top-0 mt-[80px] left-0 right-0 bg-white text-black p-5 flex items-center justify-between z-10 shadow-md">
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
                    className="mr-1"
                  />
                  <span className="text-lg font-medium">$0</span>
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
          {/* Delete Game Button - Hide on mobile */}
          <button
            onClick={handleDeleteGame}
            className="hidden md:block mt-4 px-8 py-3 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors duration-200 font-medium"
          >
            Delete Game
          </button>

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

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 md:p-8 shadow-xl transform transition-all">
            {/* Warning Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Modal Content */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Delete Game?
              </h2>
              <p className="text-gray-600">
                Are you sure you want to delete this game? This action cannot be
                undone.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse md:flex-row gap-3 md:gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteGame}
                className="w-full py-3 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors duration-200"
              >
                Delete Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
