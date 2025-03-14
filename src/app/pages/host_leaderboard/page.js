"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { database, ref, onValue, set } from "@/config/FirebaseConfig";

const LeaderboardComponent = () => {
  const router = useRouter();
  const [leaderboardData, setLeaderboardData] = useState([]); // State for leaderboard data
  const [quizTitle, setQuizTitle] = useState(""); // State for quiz title
  const [topScoreUser, setTopScoreUser] = useState({ name: "", score: 0 }); // State for top score users
  const [quizCode, setQuizCode] = useState(null);
  const [isNextQuestionAvailable, setIsNextQuestionAvailable] = useState(false); // New state for button availability

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if the window object is available (client-side)
      const storedQuizCode = sessionStorage.getItem("inviteCode");
      setQuizCode(storedQuizCode);
    }
  }, []);

  useEffect(() => {
    if (quizCode) {
      // Set quiz_checker to false when component loads
      const quizCheckerRef = ref(database, `quizzes/${quizCode}/quiz_checker`);
      set(quizCheckerRef, false);
    }
  }, [quizCode]);

  useEffect(() => {
    // Fetch quiz title from Firebase
    const quizRef = ref(database, `quizzes/${quizCode}/title`);
    const unsubscribeQuizTitle = onValue(quizRef, (snapshot) => {
      if (snapshot.exists()) {
        setQuizTitle(snapshot.val());
      }
    });

    return () => unsubscribeQuizTitle();
  }, [quizCode]);

  useEffect(() => {
    // Fetch leaderboard data from Firebase
    const participantRef = ref(database, `game_participant/${quizCode}`);

    const unsubscribe = onValue(participantRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const participantsArray = Object.entries(data).map(([user, info]) => ({
          name: user,
          score: info.score,
        }));

        // Sort participants by score descending
        const sortedParticipants = participantsArray.sort(
          (a, b) => b.score - a.score
        );

        setLeaderboardData(sortedParticipants);
        // Set top score user
        if (sortedParticipants.length > 0) {
          setTopScoreUser(sortedParticipants[0]);
        }
      } else {
        console.log("No participants found.");
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [quizCode]);

  useEffect(() => {
    // Listen for changes to `next_question` in the database
    const nextQuestionRef = ref(database, `quizzes/${quizCode}/next_question`);

    const unsubscribe = onValue(nextQuestionRef, (snapshot) => {
      if (snapshot.exists()) {
        const nextQuestionState = snapshot.val();
        // Redirect when `next_question` changes to true
        if (nextQuestionState === true) {
          router.push("./host_game_mode");
        }
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [quizCode, router]);

  useEffect(() => {
    const quizRef = ref(database, `quizzes/${quizCode}`);

    const handleData = (snapshot) => {
      const quizData = snapshot.val();

      if (!quizData) {
        router.push("./leaderboard");
        return;
      }

      const { current_question: index, questions: questionsData } = quizData;

      if (!questionsData || index >= Object.values(questionsData).length) {
        setIsNextQuestionAvailable(false);
      } else {
        setIsNextQuestionAvailable(true);
      }
    };

    const unsubscribe = onValue(quizRef, handleData);

    return () => unsubscribe();
  }, [quizCode, router]);

  const handleNextQuestion = () => {
    // Set the next_question state in Firebase to true
    const nextQuestionRef = ref(database, `quizzes/${quizCode}/next_question`);
    const quizCheckerRef = ref(database, `quizzes/${quizCode}/quiz_checker`);
    set(nextQuestionRef, true);
    set(quizCheckerRef, true);
  };

  const handleLeaderboard = () => {
    const leaderboardRef = ref(database, `quizzes/${quizCode}/leaderboard`);
    set(leaderboardRef, true);
    router.push("./leaderboard");
  };

  const winner = leaderboardData[0]?.name;
  const winnerScore = leaderboardData[0]?.score;

  return (
    <div className="min-h-screen bg-white">
      {/* Sub-header */}
      <div className="fixed top-12 mt-[30px] left-0 right-0 bg-white text-black p-4 flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center flex-grow">
          <h1 className="text-lg md:text-xl font-bold ml-4">{quizTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={
              isNextQuestionAvailable ? handleNextQuestion : handleLeaderboard
            }
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            {isNextQuestionAvailable ? "Next Question" : "Leaderboard"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto mt-40 px-4 py-8">
        <div className="bg-white rounded-3xl shadow-sm border-t-4 border-b-4 border-blue-500">
          <div className="p-6 ">
            <div className="flex items-center justify-center  gap-2 text-gray-600 mb-2">
              <img src="/leader.svg" alt="Trophy" className="w-5 h-5" />
              <span className="text-[#5E5EFF] text-xl font-semibold">
                Leaderboard
              </span>
            </div>

            {/* Winner Section */}
            {winner && (
              <div className="bg-blue-50 rounded-xl p-8 py-16 mb-8 text-center">
                <div className="text-gray-600 mb-4"></div>
                <div className="flex items-center justify-center gap-3">
                  <img src="/icons/money.svg" alt="Money" className="w-7 h-7" />
                  <div className="text-2xl text-[#5E5EFF] font-bold">
                    {winner} - {winnerScore}
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard List */}
            <div className="space-y-4">
              {leaderboardData.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-gray-300"
                  style={{ borderLeft: "5px solid #B8B8FE" }}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600 ml-4">{player.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <img src="/trophy.svg" alt="Trophy" className="w-5 h-5" />
                    )}
                    <span className="text-blue-600 mr-4 font-medium">
                      {player.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardComponent;
