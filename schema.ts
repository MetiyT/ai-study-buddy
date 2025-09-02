import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  flashcards: defineTable({
    userId: v.id("users"),
    topic: v.string(),
    question: v.string(),
    answer: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    isAiGenerated: v.boolean(),
    studyCount: v.number(),
    correctCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_topic", ["userId", "topic"])
    .searchIndex("search_content", {
      searchField: "question",
      filterFields: ["userId", "topic", "difficulty"],
    }),

  studySessions: defineTable({
    userId: v.id("users"),
    flashcardId: v.id("flashcards"),
    wasCorrect: v.boolean(),
    timeSpent: v.number(), // in seconds
  })
    .index("by_user", ["userId"])
    .index("by_flashcard", ["flashcardId"]),

  topics: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    flashcardCount: v.number(),
  })
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
