import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { FlashcardCreator } from "./FlashcardCreator";
import { FlashcardList } from "./FlashcardList";
import { StudySession } from "./StudySession";
import { TopicSelector } from "./TopicSelector";

type View = "overview" | "create" | "study" | "list";

export function StudyBuddy() {
  const [currentView, setCurrentView] = useState<View>("overview");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [studyFlashcards, setStudyFlashcards] = useState<any[]>([]);

  const topics = useQuery(api.flashcards.getUserTopics) || [];
  const flashcards = useQuery(api.flashcards.getUserFlashcards, 
    selectedTopic ? { topic: selectedTopic } : {}
  ) || [];

  const startStudySession = (topic?: string) => {
    const cardsToStudy = topic 
      ? flashcards.filter(card => card.topic === topic)
      : flashcards;
    
    if (cardsToStudy.length === 0) {
      toast.error("No flashcards found for this topic");
      return;
    }
    
    setStudyFlashcards(cardsToStudy);
    setCurrentView("study");
  };

  const renderView = () => {
    switch (currentView) {
      case "create":
        return <FlashcardCreator onBack={() => setCurrentView("overview")} />;
      case "study":
        return (
          <StudySession 
            flashcards={studyFlashcards}
            onComplete={() => {
              setCurrentView("overview");
              toast.success("Study session completed!");
            }}
            onBack={() => setCurrentView("overview")}
          />
        );
      case "list":
        return (
          <FlashcardList 
            selectedTopic={selectedTopic}
            onBack={() => setCurrentView("overview")}
          />
        );
      default:
        return (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-xl">📚</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Topics</p>
                    <p className="text-2xl font-bold text-gray-900">{topics.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-xl">🎯</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Cards</p>
                    <p className="text-2xl font-bold text-gray-900">{flashcards.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 text-xl">⚡</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">AI Generated</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {flashcards.filter(card => card.isAiGenerated).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => setCurrentView("create")}
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                  <span className="text-xl">➕</span>
                  <span className="font-medium">Create Cards</span>
                </button>
                
                <button
                  onClick={() => startStudySession()}
                  disabled={flashcards.length === 0}
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xl">🎯</span>
                  <span className="font-medium">Study All</span>
                </button>
                
                <button
                  onClick={() => setCurrentView("list")}
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all"
                >
                  <span className="text-xl">📋</span>
                  <span className="font-medium">View Cards</span>
                </button>
                
                <TopicSelector 
                  topics={topics}
                  onTopicSelect={(topic) => {
                    setSelectedTopic(topic);
                    startStudySession(topic);
                  }}
                />
              </div>
            </div>

            {/* Recent Topics */}
            {topics.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h2 className="text-xl font-semibold mb-4">Your Topics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topics.slice(0, 6).map((topic) => (
                    <div key={topic._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-medium text-gray-900 mb-2">{topic.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {topic.flashcardCount} cards
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startStudySession(topic.name)}
                          className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium"
                        >
                          Study
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTopic(topic.name);
                            setCurrentView("list");
                          }}
                          className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {renderView()}
    </div>
  );
}
