import { v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

// Get all flashcards for the current user
export const getUserFlashcards = query({
  args: { topic: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let query = ctx.db.query("flashcards").withIndex("by_user", (q) => q.eq("userId", userId));
    
    if (args.topic) {
      query = ctx.db.query("flashcards").withIndex("by_user_and_topic", (q) => 
        q.eq("userId", userId).eq("topic", args.topic)
      );
    }

    return await query.order("desc").collect();
  },
});

// Get user's topics
export const getUserTopics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("topics")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Create a manual flashcard
export const createFlashcard = mutation({
  args: {
    topic: v.string(),
    question: v.string(),
    answer: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Create or update topic
    const existingTopic = await ctx.db
      .query("topics")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), args.topic))
      .first();

    if (existingTopic) {
      await ctx.db.patch(existingTopic._id, {
        flashcardCount: existingTopic.flashcardCount + 1,
      });
    } else {
      await ctx.db.insert("topics", {
        userId,
        name: args.topic,
        flashcardCount: 1,
      });
    }

    // Create flashcard
    return await ctx.db.insert("flashcards", {
      userId,
      topic: args.topic,
      question: args.question,
      answer: args.answer,
      difficulty: args.difficulty,
      isAiGenerated: false,
      studyCount: 0,
      correctCount: 0,
    });
  },
});

// Generate AI flashcards
export const generateAIFlashcards = action({
  args: {
    topic: v.string(),
    count: v.number(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const prompt = `Generate ${args.count} ${args.difficulty} level flashcard questions and answers about "${args.topic}".
    ${args.context ? `Additional context: ${args.context}` : ''}
    
    Format your response as a JSON array with objects containing "question" and "answer" fields.
    Make sure questions are clear and answers are concise but complete.
    For ${args.difficulty} difficulty:
    - easy: Basic concepts and definitions
    - medium: Application and analysis questions  
    - hard: Complex synthesis and evaluation questions
    
    Example format:
    [
      {"question": "What is...?", "answer": "..."},
      {"question": "How does...?", "answer": "..."}
    ]`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content generated");

      const flashcards = JSON.parse(content);
      
      // Create or update topic
      const existingTopic = await ctx.runQuery(ctx.db.query("topics")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("name"), args.topic))
        .first());

      if (existingTopic) {
        await ctx.runMutation(ctx.db.patch(existingTopic._id, {
          flashcardCount: existingTopic.flashcardCount + flashcards.length,
        }));
      } else {
        await ctx.runMutation(ctx.db.insert("topics", {
          userId,
          name: args.topic,
          flashcardCount: flashcards.length,
        }));
      }

      // Insert all flashcards
      const insertedIds = [];
      for (const card of flashcards) {
        const id = await ctx.runMutation(ctx.db.insert("flashcards", {
          userId,
          topic: args.topic,
          question: card.question,
          answer: card.answer,
          difficulty: args.difficulty,
          isAiGenerated: true,
          studyCount: 0,
          correctCount: 0,
        }));
        insertedIds.push(id);
      }

      return insertedIds;
    } catch (error) {
      console.error("Error generating flashcards:", error);
      throw new Error("Failed to generate flashcards. Please try again.");
    }
  },
});

// Record study session
export const recordStudySession = mutation({
  args: {
    flashcardId: v.id("flashcards"),
    wasCorrect: v.boolean(),
    timeSpent: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Record the session
    await ctx.db.insert("studySessions", {
      userId,
      flashcardId: args.flashcardId,
      wasCorrect: args.wasCorrect,
      timeSpent: args.timeSpent,
    });

    // Update flashcard stats
    const flashcard = await ctx.db.get(args.flashcardId);
    if (flashcard && flashcard.userId === userId) {
      await ctx.db.patch(args.flashcardId, {
        studyCount: flashcard.studyCount + 1,
        correctCount: flashcard.correctCount + (args.wasCorrect ? 1 : 0),
      });
    }
  },
});

// Delete flashcard
export const deleteFlashcard = mutation({
  args: { flashcardId: v.id("flashcards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const flashcard = await ctx.db.get(args.flashcardId);
    if (!flashcard || flashcard.userId !== userId) {
      throw new Error("Flashcard not found or unauthorized");
    }

    // Update topic count
    const topic = await ctx.db
      .query("topics")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), flashcard.topic))
      .first();

    if (topic && topic.flashcardCount > 1) {
      await ctx.db.patch(topic._id, {
        flashcardCount: topic.flashcardCount - 1,
      });
    } else if (topic) {
      await ctx.db.delete(topic._id);
    }

    await ctx.db.delete(args.flashcardId);
  },
});

// Search flashcards
export const searchFlashcards = query({
  args: { 
    searchTerm: v.string(),
    topic: v.optional(v.string()),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let searchQuery = ctx.db
      .query("flashcards")
      .withSearchIndex("search_content", (q) => 
        q.search("question", args.searchTerm).eq("userId", userId)
      );

    if (args.topic) {
      searchQuery = searchQuery.filter((q) => q.eq(q.field("topic"), args.topic));
    }

    if (args.difficulty) {
      searchQuery = searchQuery.filter((q) => q.eq(q.field("difficulty"), args.difficulty));
    }

    return await searchQuery.take(20);
  },
});
