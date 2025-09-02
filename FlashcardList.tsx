import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface FlashcardListProps {
  selectedTopic: string;
  onBack: () => void;
}

export function FlashcardList({ selectedTopic, onBack }: FlashcardListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const flashcards = useQuery(api.flashcards.getUserFlashcards, 
    selectedTopic ? { topic: selectedTopic } : {}
  ) || [];

  const searchResults = useQuery(api.flashcards.searchFlashcards, 
    searchTerm.trim() ? {
      searchTerm: searchTerm.trim(),
      topic: selectedTopic || undefined,
      difficulty: filterDifficulty as any || undefined,
    } : "skip"
  ) || [];

  const deleteFlashcard = useMutation(api.flashcards.deleteFlashcard);

  const displayCards = searchTerm.trim() ? searchResults : flashcards;
  const filteredCards = filterDifficulty 
    ? displayCards.filter(card => card.difficulty === filterDifficulty)
    : displayCards;

  const handleDelete = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this flashcard?")) return;
    
    try {
      await deleteFlashcard({ flashcardId: cardId });
      toast.success("Flashcard deleted successfully");
    } catch (error) {
      toast.error("Failed to delete flashcard");
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

  const getAccuracy = (card: any) => {
    if (card.studyCount === 0) return 0;
    return Math.round((card.correctCount / card.studyCount) * 100);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-xl">←</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedTopic ? `${selectedTopic} Flashcards` : "All Flashcards"}
            </h1>
            <p className="text-gray-600">{filteredCards.length} cards</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search flashcards..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Cards Grid */}
        {filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">📚</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No flashcards found</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search terms" : "Create some flashcards to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCards.map((card) => (
              <div key={card._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(card.difficulty)}`}>
                      {card.difficulty}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {card.topic}
                    </span>
                    {card.isAiGenerated && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        🤖 AI
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(card._id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    🗑️
                  </button>
                </div>

                <div className="mb-3">
                  <h3 className="font-medium text-gray-900 mb-2">{card.question}</h3>
                  
                  {expandedCard === card._id ? (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-gray-800">{card.answer}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedCard(card._id)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Show Answer
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <span>Studied: {card.studyCount} times</span>
                    <span>Accuracy: {getAccuracy(card)}%</span>
                  </div>
                  {expandedCard === card._id && (
                    <button
                      onClick={() => setExpandedCard(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Hide Answer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
