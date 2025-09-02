import { useState } from "react";

interface TopicSelectorProps {
  topics: any[];
  onTopicSelect: (topic: string) => void;
}

export function TopicSelector({ topics, onTopicSelect }: TopicSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (topics.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed">
        <span className="text-xl">📖</span>
        <span className="font-medium">No Topics Yet</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all w-full"
      >
        <span className="text-xl">📖</span>
        <span className="font-medium">Study by Topic</span>
        <span className="ml-auto">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          {topics.map((topic) => (
            <button
              key={topic._id}
              onClick={() => {
                onTopicSelect(topic.name);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
            >
              <div className="font-medium text-gray-900">{topic.name}</div>
              <div className="text-sm text-gray-600">{topic.flashcardCount} cards</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
