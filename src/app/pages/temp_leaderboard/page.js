"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { database, ref, onValue } from "@/config/FirebaseConfig";

const LeaderboardComponent = () => {
  const router = useRouter();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizCode, setQuizCode] = useState(null);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQuizCode(sessionStorage.getItem("inviteCode"));
      setUsername(sessionStorage.getItem("username"));
    }
  }, []);

  useEffect(() => {
    const participantRef = ref(database, `game_participant/${quizCode}`);

    const unsubscribe = onValue(participantRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const participantsArray = Object.entries(data).map(([user, info]) => ({
          name: user,
          score: info.score,
          isWinner: user === username,
        }));

        const sortedParticipants = participantsArray.sort(
          (a, b) => b.score - a.score
        );

        setLeaderboardData(sortedParticipants);
      }
    });

    return () => unsubscribe();
  }, [quizCode, username]);

  useEffect(() => {
    const quizRef = ref(database, `quizzes/${quizCode}/title`);
    const unsubscribeQuizTitle = onValue(quizRef, (snapshot) => {
      if (snapshot.exists()) {
        setQuizTitle(snapshot.val());
      }
    });

    return () => unsubscribeQuizTitle();
  }, [quizCode]);

  useEffect(() => {
    const nextQuestionRef = ref(database, `quizzes/${quizCode}/next_question`);
    const leaderboardRef = ref(database, `quizzes/${quizCode}/leaderboard`);

    const unsubscribeNextQuestion = onValue(nextQuestionRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val() === true) {
        router.push("./user_game_mode");
      }
    });

    const unsubscribeLeaderboard = onValue(leaderboardRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val() === true) {
        router.push("./leaderboard");
      }
    });

    return () => {
      unsubscribeNextQuestion();
      unsubscribeLeaderboard();
    };
  }, [quizCode, router]);

  const winner = leaderboardData[0]?.name || "";
  const winnerScore = leaderboardData[0]?.score || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white mt-20 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/arrowleft.svg"
              alt="Back Arrow"
              className="w-6 h-6 cursor-pointer"
            />
            <h1 className="text-xl font-semibold">{quizTitle}</h1>
          </div>
          <div className="flex gap-4">
            <div className="bouncing-loader delay-1"></div>
            <div className="bouncing-loader delay-2"></div>
            <div className="bouncing-loader delay-3"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
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
