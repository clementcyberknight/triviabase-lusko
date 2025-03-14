"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  database,
  ref,
  onValue,
  set,
  get,
  update,
  off,
  query,
  orderByChild,
} from "@/config/FirebaseConfig";
import { useRouter } from "next/navigation";
import { isEqual } from "lodash";
import { X } from "lucide-react";

const QuizPage = () => {
  const router = useRouter();
  const [gameState, setGameState] = useState({
    selectedAnswer: null,
    questionIndex: 0,
    questions: [],
    timeLeft: 15,
    score: 0,
    isSubmitted: false,
    isLoading: true,
    leaderboard: [],
  });

  const [quizCode, setQuizCode] = useState(null);
  const [username, setUsername] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [feedback, setFeedback] = useState("");
  const submitRef = useRef(false);
  const [quizData, setQuizData] = useState(null);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const code = sessionStorage.getItem("inviteCode");
      const name = sessionStorage.getItem("username");
      setQuizCode(code);
      setUsername(name);
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoadingSession) {
      if (!quizCode || !username) {
        router.push("./dashboard");
      }
    }
  }, [isLoadingSession, quizCode, username, router]);

  useEffect(() => {
    if (!quizCode) return;

    const quizRef = ref(database, `paid_quizzes/${quizCode}`);
    const unsubscribeQuiz = onValue(quizRef, (snapshot) => {
      if (snapshot.exists()) {
        setQuizData(snapshot.val());
      }
    });

    return () => unsubscribeQuiz();
  }, [quizCode]);

  // Fetch the current question index and questions
  useEffect(() => {
    if (!quizCode) return;

    const quizRef = ref(database, `paid_quizzes/${quizCode}`);

    const handleData = async (snapshot) => {
      const quizData = snapshot.val();

      if (!quizData) {
        router.push("./paid_leaderboard");
        return;
      }

      if (!quizData.quiz_checker) {
        router.push("./paid_temp_leaderboard");
        return;
      }

      const { current_question: index, questions: questionsData } = quizData;

      if (!questionsData) {
        router.push("./paid_leaderboard");
        return;
      }

      const questionsArray = Object.values(questionsData);

      if (index >= questionsArray.length) {
        router.push("./paid_leaderboard");
        return;
      }

      // Check if the user has already submitted an answer for the current question
      const userAnswersRef = ref(
        database,
        `paid_quizzes/${quizCode}/questions/${index}/participant/user_answers/${username}`
      );
      const userAnswersSnapshot = await get(userAnswersRef);
      const hasUserSubmitted =
        userAnswersSnapshot.exists() && userAnswersSnapshot.val().submitted;

      setGameState((prev) => {
        const newState = {
          ...prev,
          questionIndex: index,
          questions: questionsArray,
          isLoading: false,
          isSubmitted: hasUserSubmitted,
        };
        return isEqual(prev, newState) ? prev : newState; // Prevent unnecessary re-renders
      });
    };

    onValue(quizRef, handleData);

    return () => {
      off(quizRef);
    };
  }, [quizCode, username, router]);

  const currentQuestion = useMemo(
    () => gameState.questions[gameState.questionIndex] || null,
    [gameState.questions, gameState.questionIndex]
  );

  // Leaderboard updates only if not mobile
  useEffect(() => {
    if (!quizCode || !currentQuestion || isMobile) return;

    const questionIndexRef = ref(
      database,
      `paid_quizzes/${quizCode}/current_question`
    );

    const fetchCurrentQuestionIndex = async () => {
      const questionIndexSnapshot = await get(questionIndexRef);
      return questionIndexSnapshot.val();
    };

    fetchCurrentQuestionIndex().then((currentQuestionIndex) => {
      const leaderboardQuery = query(
        ref(
          database,
          `paid_quizzes/${quizCode}/questions/${currentQuestionIndex}/participant/user_answers`
        ),
        orderByChild("score") // Order by score on the server-side
      );

      const handleLeaderboardUpdate = (snapshot) => {
        if (snapshot.val()) {
          const data = snapshot.val();
          const leaderboardData = Object.entries(data)
            .map(([user, userData]) => ({
              username: user,
              ...userData,
            }))
            .sort((a, b) => b.score - a.score); // Still sort client-side for initial load or quick updates

          setGameState((prev) => {
            // Deep compare to prevent unnecessary re-renders
            if (isEqual(prev.leaderboard, leaderboardData)) {
              return prev;
            }
            return {
              ...prev,
              leaderboard: leaderboardData,
            };
          });
        }
      };

      onValue(leaderboardQuery, handleLeaderboardUpdate); // Use the ordered query
      return () => off(leaderboardQuery);
    });
  }, [quizCode, currentQuestion, isMobile]);

  // Timer effect
  useEffect(() => {
    if (gameState.isLoading) return;

    const timerInterval = setInterval(() => {
      setGameState((prev) => {
        if (prev.timeLeft <= 1) {
          clearInterval(timerInterval);
          router.push("./paid_temp_leaderboard");
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gameState.isLoading, router]); // Removed gameState.isSubmitted

  const handleAnswerSelect = useCallback((index) => {
    setGameState((prev) => ({
      ...prev,
      selectedAnswer: index,
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitRef.current) {
      return;
    }
    submitRef.current = true;
    if (
      !currentQuestion ||
      gameState.isSubmitted ||
      gameState.selectedAnswer === null
    ) {
      submitRef.current = false;
      return;
    }

    setGameState((prev) => ({ ...prev, isSubmitted: true }));

    const isCorrect =
      gameState.selectedAnswer === currentQuestion.correctAnswer;

    const baseScore = 100;
    const maxTimeBonus = 50;
    const timeFactor = Math.pow(gameState.timeLeft / 15, 2);

    const calculatedScore = Math.round(
      isCorrect ? baseScore + maxTimeBonus * timeFactor : 0
    );

    setFeedback(
      isCorrect
        ? `Correct! You earned ${calculatedScore} points!`
        : `Incorrect. The correct answer was: ${
            currentQuestion.options[currentQuestion.correctAnswer]
          }`
    );

    try {
      const scoreRef = ref(
        database,
        `game_participant/${quizCode}/${username}/score`
      );
      const snapshot = await get(scoreRef);
      const currentScore = snapshot.val() || 0;
      const updatedScore = currentScore + calculatedScore;

      const questionIndexRef = ref(
        database,
        `paid_quizzes/${quizCode}/current_question`
      );
      const questionIndexSnapshot = await get(questionIndexRef);
      const currentQuestionIndex = questionIndexSnapshot.val();

      await Promise.all([
        set(
          ref(
            database,
            `paid_quizzes/${quizCode}/questions/${currentQuestionIndex}/participant/user_answers/${username}`
          ),
          {
            currentQuestion: currentQuestionIndex,
            answer: gameState.selectedAnswer,
            score: calculatedScore,
            timeLeft: gameState.timeLeft,
            submitted: true, // Add submitted flag
          }
        ),
        update(ref(database, `game_participant/${quizCode}/${username}`), {
          score: updatedScore,
        }),
      ]);
    } catch (error) {
      console.error("Error updating game state:", error);
    } finally {
      submitRef.current = false;
    }
  }, [currentQuestion, gameState, quizCode, username]);

  // Add visibility change handler
  useEffect(() => {
    if (!quizCode || gameState.isLoading) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        router.push("./paid_temp_leaderboard");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", () =>
      router.push("./paid_temp_leaderboard")
    );

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", () =>
        router.push("./paid_temp_leaderboard")
      );
    };
  }, [quizCode, gameState.isLoading, router]);

  const openLeaderboardModal = () => {
    setIsLeaderboardModalOpen(true);
  };

  const closeLeaderboardModal = () => {
    setIsLeaderboardModalOpen(false);
  };

  if (gameState.isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-semibold text-blue-600">
          Loading quiz...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Main Content */}
      <div
        className={`max-w-6xl mx-auto px-4 ${
          isMobile ? "pt-28" : "pt-20  mt-16"
        }`}
      >
        {/* the leaderboard modal for mobile*/}
        {isMobile && (
          <div className="mt-4 px-4 py-3 bg-white border-b border-gray-200 rounded-lg">
            <div
              className="flex items-center space-x-2 text-blue-600"
              onClick={openLeaderboardModal}
            >
              <img
                src="/leader.svg"
                alt="Leaderboard Icon"
                className="h-5 w-5"
              />
              <span className="font-medium">Leaderboard</span>
            </div>
          </div>
        )}

        {/* Leaderboard Modal */}
        {isLeaderboardModalOpen && (
          <div className="fixed inset-0 mt-20 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl flex flex-col h-[80vh]">
              {/* Header - Fixed */}
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-600">
                    <img
                      src="/leader.svg"
                      alt="Leaderboard Icon"
                      className="h-5 w-5"
                    />
                    <span className="font-medium text-lg">Leaderboard</span>
                  </div>
                  <button
                    onClick={closeLeaderboardModal}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {gameState.leaderboard.map((player, index) => (
                      <div
                        key={player.username}
                        className={`p-3 rounded-lg ${
                          player.username === username
                            ? "bg-blue-50"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {index + 1}. {player.username}
                          </span>
                          <span className="text-blue-600 font-semibold">
                            {player.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timer Section */}
                <div className="text-center border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-500 mb-1">
                    Time Remaining
                  </div>
                  <div className="text-4xl font-semibold text-blue-600 mb-4">
                    {`00:${gameState.timeLeft.toString().padStart(2, "0")}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-600 mt-2 rounded-2xl overflow-hidden shadow-lg border border-blue-100">
          <div className="flex flex-col md:flex-row">
            {!isMobile && (
              <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-6">
                    <img
                      src="/leader.svg"
                      alt="Leaderboard Icon"
                      className="h-5 w-5"
                    />
                    <h2 className="text-lg font-semibold">Leaderboard</h2>
                  </div>
                  <div
                    className="space-y-3 overflow-auto"
                    style={{
                      maxHeight: "250px",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    <style>
                      {`
                      .space-y-3::-webkit-scrollbar {
                        display: none;
                      }
                      .space-y-3 {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                      }
                    `}
                    </style>
                    {gameState.leaderboard.map((player, index) => (
                      <div
                        key={player.username}
                        className={`p-2 rounded ${
                          player.username === username
                            ? "bg-blue-50"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {index + 1}. {player.username}
                          </span>
                          <span className="text-blue-600 font-semibold">
                            {player.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-1">
                      Time Remaining
                    </div>
                    <div className="text-4xl font-semibold text-blue-600">
                      {`00:${gameState.timeLeft.toString().padStart(2, "0")}`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 mt-[50px] bg-blue-600 p-4 md:p-8">
              {currentQuestion && (
                <>
                  {isMobile && (
                    <div className="bg-white rounded-lg p-3 mb-4 text-center">
                      <div className="text-sm text-gray-500">
                        Time Remaining
                      </div>
                      <div className="text-2xl font-semibold text-blue-600">
                        {`00:${gameState.timeLeft.toString().padStart(2, "0")}`}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-6 md:mb-12">
                    <span className="text-white text-base md:text-lg">
                      {`${gameState.questionIndex + 1} — ${
                        gameState.questions.length
                      }`}
                    </span>
                    <button
                      className={`bg-white text-blue-600 px-4 md:px-6 py-2 rounded-full font-medium text-sm md:text-base transition-colors
                        ${
                          gameState.isSubmitted ||
                          gameState.timeLeft === 0 ||
                          gameState.selectedAnswer === null
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-blue-50"
                        }`}
                      onClick={handleSubmit}
                      disabled={
                        gameState.isSubmitted ||
                        gameState.timeLeft === 0 ||
                        gameState.selectedAnswer === null
                      }
                    >
                      Submit →
                    </button>
                  </div>
                  <div className="text-center mb-8 md:mb-16">
                    <h1 className="text-white text-xl md:text-3xl font-bold">
                      {currentQuestion.text}
                    </h1>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={index}
                        className={`bg-blue-500 hover:bg-blue-400 text-white p-4 md:p-6 rounded-xl flex items-center gap-4 transition-colors
                          ${
                            gameState.selectedAnswer === index
                              ? "bg-blue-400 ring-2 ring-white"
                              : ""
                          }`}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={gameState.isSubmitted}
                      >
                        <span className="text-lg md:text-xl font-medium">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-base md:text-lg">{option}</span>
                      </button>
                    ))}
                  </div>
                  {gameState.isSubmitted && (
                    <div className="mt-6 text-center text-lg font-semibold text-white bg-blue-700 p-3 rounded-lg">
                      {feedback}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
