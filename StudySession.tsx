import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface StudySessionProps {
  flashcards: any[];
  onComplete: () => void;
  onBack: () => void;
}

export function StudySession({ flashcards, onComplete, onBack }: StudySessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    startTime: Date.now(),
  });
  const [cardStartTime, setCardStartTime] = useState(Date.now());

  const recordStudySession = useMutation(api.flashcards.recordStudySession);

  const currentCard = flashcards[currentIndex];
  const isLastCard = currentIndex === flashcards.length - 1;

  useEffect(() => {
    setCardStartTime(Date.now());
  }, [currentIndex]);

  const handleAnswer = async (wasCorrect: boolean) => {
    const timeSpent = Math.floor((Date.now() - cardStartTime) / 1000);
    
    try {
      await recordStudySession({
        flashcardId: currentCard._id,
        wasCorrect,
        timeSpent,
      });

      setSessionStats(prev => ({
        ...prev,
        correct: prev.correct + (wasCorrect ? 1 : 0),
        incorrect: prev.incorrect + (wasCorrect ? 0 : 1),
      }));

      if (isLastCard) {
        onComplete();
      } else {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      }
    } catch (error) {
      toast.error("Failed to record answer");
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "hard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-xl">←</span>
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Study Session</h1>
            <p className="text-sm text-gray-600">
              Card {currentIndex + 1} of {flashcards.length}
            </p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <div>✅ {sessionStats.correct}</div>
            <div>❌ {sessionStats.incorrect}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 mb-6 min-h-[300px] flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(currentCard.difficulty)}`}>
              {currentCard.difficulty}
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {currentCard.topic}
            </span>
            {currentCard.isAiGenerated && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                🤖 AI
              </span>
            )}
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {currentCard.question}
            </h2>

            {showAnswer ? (
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <p className="text-gray-800 leading-relaxed">
                  {currentCard.answer}
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowAnswer(true)}
                className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                Show Answer
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {showAnswer && (
          <div className="flex gap-4">
            <button
              onClick={() => handleAnswer(false)}
              className="flex-1 py-3 px-4 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
            >
              ❌ Incorrect
            </button>
            <button
              onClick={() => handleAnswer(true)}
              className="flex-1 py-3 px-4 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              ✅ Correct
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Accuracy: {sessionStats.correct + sessionStats.incorrect > 0 
              ? Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100)
              : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}
