import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Knowledge Base - Admin provides subjects and information, AI memorizes and uses for semantic search
export const knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(), // The topic/subject
  information: text("information").notNull(), // The detailed information admin provides
  embedding: text("embedding"), // Vector embedding for semantic search (stored as JSON string)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  embedding: true,
});

export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;

// Tickets - Logged support tickets
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: text("channel_id").notNull(),
  channelName: text("channel_name").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  content: text("content").notNull(),
  sentiment: text("sentiment"), // "positive", "neutral", "negative"
  urgency: text("urgency"), // "low", "medium", "high"
  status: text("status").notNull().default("open"), // "open", "responded", "closed"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

// Bot Responses - AI-generated responses to tickets
export const botResponses = pgTable("bot_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected", "sent"
  messageId: text("message_id"), // Discord message ID for feedback tracking
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBotResponseSchema = createInsertSchema(botResponses).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

export type InsertBotResponse = z.infer<typeof insertBotResponseSchema>;
export type BotResponse = typeof botResponses.$inferSelect;

// Feedback - User feedback on bot responses
export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  responseId: varchar("response_id").notNull(),
  ticketId: varchar("ticket_id").notNull(),
  userId: text("user_id").notNull(),
  rating: integer("rating").notNull(), // 1 = thumbs down, 5 = thumbs up
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

// Bot Configuration
export const botConfig = pgTable("bot_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  autoRespond: boolean("auto_respond").notNull().default(true),
  requireApproval: boolean("require_approval").notNull().default(false),
  responseDelay: integer("response_delay").notNull().default(2000), // milliseconds
  maxTokens: integer("max_tokens").notNull().default(500),
  systemPrompt: text("system_prompt").notNull().default("Você é um assistente de suporte útil e prestativo. Use a base de conhecimento fornecida para responder perguntas de forma clara e profissional em português."),
  fallbackMessage: text("fallback_message").notNull().default("Desculpe, não tenho informações suficientes para responder essa pergunta. Um agente humano irá ajudá-lo em breve."),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBotConfigSchema = createInsertSchema(botConfig).omit({
  id: true,
  updatedAt: true,
});

export const updateBotConfigSchema = insertBotConfigSchema.partial();

export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type UpdateBotConfig = z.infer<typeof updateBotConfigSchema>;
export type BotConfig = typeof botConfig.$inferSelect;

// Paused Channels - Track which channels have AI responses paused
export const pausedChannels = pgTable("paused_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: text("channel_id").notNull().unique(),
  guildId: text("guild_id").notNull(),
  channelName: text("channel_name").notNull(),
  pausedAt: timestamp("paused_at").notNull().defaultNow(),
});

export const insertPausedChannelSchema = createInsertSchema(pausedChannels).omit({
  id: true,
  pausedAt: true,
});

export type InsertPausedChannel = z.infer<typeof insertPausedChannelSchema>;
export type PausedChannel = typeof pausedChannels.$inferSelect;
