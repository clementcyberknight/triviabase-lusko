"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { database, ref, onValue, set, get } from "@/config/FirebaseConfig"; // Adjust the import based on your actual path

export default function GamePage() {
  const [quizCode, setQuizCode] = useState(null);
  const [username, setUsername] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20); // Total timer set to 20 seconds
  const [loading, setLoading] = useState(true); // Loading state for waiting for answers
  const [responses, setResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [title, setTitle] = useState(null);

  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedQuizCode = sessionStorage.getItem("inviteCode");
      const storedUsername = sessionStorage.getItem("username");
      const storedIndex =
        parseInt(sessionStorage.getItem("currentQuestionIndex"), 10) || 0;

      setQuizCode(storedQuizCode);
      setUsername(storedUsername);
      setCurrentQuestionIndex(storedIndex);

      // Indicate that initialization is complete
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    if (isInitializing) {
      return;
    }
    if (!quizCode) {
      router.push("./dashboard");
      return;
    }

    const quizRef = ref(database, `quizzes/${quizCode}`);
    onValue(quizRef, (snapshot) => {
      if (snapshot.exists()) {
        const quizData = snapshot.val();
        setTitle(quizData.title); // Set the title from quizData
      }
    });

    const nextQuestionRef = ref(database, `quizzes/${quizCode}/next_question`);
    set(nextQuestionRef, false);

    const questionsRef = ref(database, `quizzes/${quizCode}/questions`);

    const handleQuestionData = (snapshot) => {
      if (snapshot.exists()) {
        const questionsData = snapshot.val();
        const questionsArray = Object.values(questionsData);
        const storedIndex =
          parseInt(sessionStorage.getItem("currentQuestionIndex"), 10) || 0;

        if (questionsArray[storedIndex]) {
          setQuestions(questionsArray);
          setCurrentQuestionIndex(storedIndex);
          setLoading(false);
        } else if (storedIndex >= questionsArray.length) {
          const nextQuestionIndex = 100; // You may want to adjust this logic based on your application needs
          const questionIndexRef = ref(
            database,
            `quizzes/${quizCode}/current_question`
          );
          set(questionIndexRef, nextQuestionIndex); // Use nextQuestionIndex instead of newQuestionIndex
          router.push("./leaderboard");
        } else {
          setQuestions(questionsArray);
          setCurrentQuestionIndex(0); // Start from the first question if the stored index is invalid
          sessionStorage.setItem("currentQuestionIndex", 0);
          setLoading(false);
        }
      } else {
        router.push("./leaderboard");
      }
    };

    onValue(questionsRef, handleQuestionData);

    // Countdown timer logic
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Save current question index in session storage
          const newQuestionIndex = currentQuestionIndex + 1;
          sessionStorage.setItem("currentQuestionIndex", newQuestionIndex);
          const questionIndexRef = ref(
            database,
            `quizzes/${quizCode}/current_question`
          );
          set(questionIndexRef, newQuestionIndex);
          router.push("./host_leaderboard");
          return 0; // Stop countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer); // Cleanup the timer
  }, [quizCode, username, router, currentQuestionIndex]);

  // Fetch responses for the current question
  useEffect(() => {
    if (questions.length > 0) {
      const fetchCurrentQuestionIndex = async () => {
        const questionIndexRef = ref(
          database,
          `quizzes/${quizCode}/current_question`
        );
        const questionIndexSnapshot = await get(questionIndexRef);
        return questionIndexSnapshot.val();
      };

      fetchCurrentQuestionIndex().then((currentQuestionIndexFromDB) => {
        const currentQuestion = questions[currentQuestionIndex];
        const participantsRef = ref(
          database,
          `quizzes/${quizCode}/questions/${currentQuestionIndexFromDB}/participant/user_answers`
        );

        const handleResponsesData = (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const responsesArray = Object.entries(data).map(([user, info]) => ({
              name: user,
              score: info.score,
              selectedOption: info.answer,
              timeLeft: info.timeLeft,
              isCorrect: info.answer === currentQuestion.correctAnswer, // Check if answer is correct
            }));
            setResponses(responsesArray);
          } else {
            setResponses([]); // Reset responses if no data
          }
          setLoading(false); // Set loading to false once responses are fetched
        };

        // Attach the listener and store the unsubscribe function
        const unsubscribe = onValue(participantsRef, handleResponsesData);

        // Cleanup the listener on unmount
        return () => {
          unsubscribe();
        };
      });
    }
  }, [questions, currentQuestionIndex, quizCode]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      {/* sub-Header of the page*/}
      <div className="fixed top-12 mt-[30px] left-0 right-0 bg-white text-black p-4 flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center flex-grow">
          <h1 className="text-lg md:text-xl font-bold ml-4">{title}</h1>
        </div>
        <div className="flex items-center gap-2"></div>
      </div>

      {/* Main Content */}
      <main
        className="w-full max-w-sm md:max-w-4xl mt-36 p-4 md:p-6 bg-[#004EF3] rounded-3xl shadow-lg text-center"
        style={{ height: "auto", overflow: "hidden" }}
      >
        {/* question header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#004EF3] text-white py-4 px-4 md:px-6 rounded-t-lg">
          <div className="text-lg md:text-xl font-bold">
            Question {currentQuestionIndex + 1} / {questions.length}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm md:text-base">Timer</span>
            <span className="bg-white text-[#004EF3] px-2 py-1 rounded text-sm md:text-base">
              {`00:${timeLeft.toString().padStart(2, "0")}`}
            </span>
          </div>
        </div>

        {/* Question Section */}
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-white">
            {questions.length > 0
              ? questions[currentQuestionIndex].text
              : "Loading question..."}
          </h2>
        </div>

        {/* Responses Section */}
        <div
          className="mt-8 overflow-y-auto"
          style={{
            maxHeight: "350px",
            scrollbarWidth: "none",
            "-ms-overflow-style": "none",
          }}
        >
          {/* Sub-header for Responses */}
          <div className="flex justify-center mt-8 items-center bg-white p-4 rounded-t-3xl shadow">
            <img
              src="/response.svg"
              alt="Responses Icon"
              className="h-6 w-6 mr-2"
            />
            <h2 className="text-lg text-[#5E5EFF] font-bold">Responses</h2>
          </div>
          <div className="border-b -mt-2 border-[#5E5EFF] w-full" />

          <div
            className=" p-6 rounded-b-3xl bg-white "
            style={{
              height: "260px",
              overflowY: "scroll",
              scrollbarWidth: "none",
              "-ms-overflow-style": "none",
            }}
          >
            {loading ? (
              <div
                className="flex justify-center items-center space-x-2 text-gray-500"
                style={{ height: "100%" }}
              >
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
                <span>Waiting for responses...</span>
              </div>
            ) : (
              <div className="text-left">
                {responses.map((response, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-4 bg-white rounded-lg shadow mb-2"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Player Name */}
                      <span className="text-lg font-semibold">
                        {response.name}
                      </span>
                      {/* Round Milky Button with Vote Count */}
                      <span className="bg-gray-200 text-gray-700 rounded-full px-3 py-1 text-sm font-bold">
                        {response.score}
                      </span>
                    </div>

                    {/* Correct/Incorrect Icon */}
                    <span>
                      {response.isCorrect ? (
                        <img
                          src="/right.svg"
                          alt="Correct"
                          className="h-6 w-6"
                        />
                      ) : (
                        <img
                          src="/wrong.svg"
                          alt="Incorrect"
                          className="h-6 w-6"
                        />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
