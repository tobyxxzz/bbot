import {
  type KnowledgeBase,
  type InsertKnowledgeBase,
  type Ticket,
  type InsertTicket,
  type BotResponse,
  type InsertBotResponse,
  type Feedback,
  type InsertFeedback,
  type BotConfig,
  type InsertBotConfig,
  type UpdateBotConfig,
  type PausedChannel,
  type InsertPausedChannel,
  knowledgeBase,
  tickets,
  botResponses,
  feedback,
  botConfig,
  pausedChannels,
} from "@shared/schema";
import { db } from "./db.js";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Knowledge Base
  getKnowledgeEntries(): Promise<KnowledgeBase[]>;
  getKnowledgeEntry(id: string): Promise<KnowledgeBase | undefined>;
  createKnowledgeEntry(entry: InsertKnowledgeBase): Promise<KnowledgeBase>;
  deleteKnowledgeEntry(id: string): Promise<void>;
  updateKnowledgeEntryEmbedding(id: string, embedding: string): Promise<void>;

  // Tickets
  getTickets(limit?: number): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  getTicketsByChannel(channelId: string): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicketStatus(id: string, status: string): Promise<void>;
  updateTicketSentiment(id: string, sentiment: string, urgency: string): Promise<void>;

  // Bot Responses
  getBotResponses(ticketId?: string): Promise<BotResponse[]>;
  getPendingResponses(): Promise<BotResponse[]>;
  createBotResponse(response: InsertBotResponse): Promise<BotResponse>;
  updateResponseStatus(id: string, status: string): Promise<void>;
  markResponseSent(id: string): Promise<void>;
  updateResponseWithMessageId(id: string, messageId: string): Promise<void>;

  // Feedback
  getFeedback(responseId?: string): Promise<Feedback[]>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;

  // Bot Config
  getBotConfig(): Promise<BotConfig | undefined>;
  createBotConfig(config: InsertBotConfig): Promise<BotConfig>;
  updateBotConfig(config: UpdateBotConfig): Promise<BotConfig>;

  // Paused Channels
  pauseChannel(channelId: string, guildId: string, channelName: string): Promise<PausedChannel>;
  resumeChannel(channelId: string): Promise<void>;
  isChannelPaused(channelId: string): Promise<boolean>;
  getPausedChannels(): Promise<PausedChannel[]>;
}

export class DatabaseStorage implements IStorage {
  // Knowledge Base
  async getKnowledgeEntries(): Promise<KnowledgeBase[]> {
    return await db
      .select()
      .from(knowledgeBase)
      .orderBy(desc(knowledgeBase.createdAt));
  }

  async getKnowledgeEntry(id: string): Promise<KnowledgeBase | undefined> {
    const [entry] = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.id, id));
    return entry || undefined;
  }

  async createKnowledgeEntry(insertEntry: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [entry] = await db
      .insert(knowledgeBase)
      .values(insertEntry)
      .returning();
    return entry;
  }

  async deleteKnowledgeEntry(id: string): Promise<void> {
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
  }

  async updateKnowledgeEntryEmbedding(id: string, embedding: string): Promise<void> {
    await db
      .update(knowledgeBase)
      .set({ embedding })
      .where(eq(knowledgeBase.id, id));
  }

  // Tickets
  async getTickets(limit?: number): Promise<Ticket[]> {
    const query = db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.createdAt));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id));
    return ticket || undefined;
  }

  async getTicketsByChannel(channelId: string): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .where(eq(tickets.channelId, channelId))
      .orderBy(desc(tickets.createdAt));
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const [ticket] = await db
      .insert(tickets)
      .values(insertTicket)
      .returning();
    return ticket;
  }

  async updateTicketStatus(id: string, status: string): Promise<void> {
    await db
      .update(tickets)
      .set({ status })
      .where(eq(tickets.id, id));
  }

  async updateTicketSentiment(id: string, sentiment: string, urgency: string): Promise<void> {
    await db
      .update(tickets)
      .set({ sentiment, urgency })
      .where(eq(tickets.id, id));
  }

  // Bot Responses
  async getBotResponses(ticketId?: string): Promise<BotResponse[]> {
    if (ticketId) {
      return await db
        .select()
        .from(botResponses)
        .where(eq(botResponses.ticketId, ticketId))
        .orderBy(desc(botResponses.createdAt));
    }
    return await db
      .select()
      .from(botResponses)
      .orderBy(desc(botResponses.createdAt));
  }

  async getPendingResponses(): Promise<BotResponse[]> {
    return await db
      .select()
      .from(botResponses)
      .where(eq(botResponses.status, "pending"))
      .orderBy(botResponses.createdAt);
  }

  async createBotResponse(insertResponse: InsertBotResponse): Promise<BotResponse> {
    const [response] = await db
      .insert(botResponses)
      .values(insertResponse)
      .returning();
    return response;
  }

  async updateResponseStatus(id: string, status: string): Promise<void> {
    await db
      .update(botResponses)
      .set({ status })
      .where(eq(botResponses.id, id));
  }

  async markResponseSent(id: string): Promise<void> {
    await db
      .update(botResponses)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(botResponses.id, id));
  }

  async updateResponseWithMessageId(id: string, messageId: string): Promise<void> {
    await db
      .update(botResponses)
      .set({ messageId })
      .where(eq(botResponses.id, id));
  }

  // Feedback
  async getFeedback(responseId?: string): Promise<Feedback[]> {
    if (responseId) {
      return await db
        .select()
        .from(feedback)
        .where(eq(feedback.responseId, responseId))
        .orderBy(desc(feedback.createdAt));
    }
    return await db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt));
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const [fb] = await db
      .insert(feedback)
      .values(insertFeedback)
      .returning();
    return fb;
  }

  // Bot Config
  async getBotConfig(): Promise<BotConfig | undefined> {
    const [config] = await db
      .select()
      .from(botConfig)
      .limit(1);
    
    if (!config) {
      return await this.createBotConfig({
        autoRespond: true,
        requireApproval: false,
        responseDelay: 2000,
        maxTokens: 500,
        systemPrompt: "Você é um assistente de suporte útil e prestativo. Use a base de conhecimento fornecida para responder perguntas de forma clara e profissional em português.",
        fallbackMessage: "Desculpe, não tenho informações suficientes para responder essa pergunta. Um agente humano irá ajudá-lo em breve.",
      });
    }
    
    return config;
  }

  async createBotConfig(insertConfig: InsertBotConfig): Promise<BotConfig> {
    const [config] = await db
      .insert(botConfig)
      .values(insertConfig)
      .returning();
    return config;
  }

  async updateBotConfig(updateConfig: UpdateBotConfig): Promise<BotConfig> {
    const existing = await this.getBotConfig();
    if (!existing) {
      throw new Error("Config not found");
    }

    const [updated] = await db
      .update(botConfig)
      .set({
        ...updateConfig,
        updatedAt: new Date(),
      })
      .where(eq(botConfig.id, existing.id))
      .returning();
    
    return updated;
  }

  // Paused Channels
  async pauseChannel(channelId: string, guildId: string, channelName: string): Promise<PausedChannel> {
    // Check if already paused
    const existing = await db
      .select()
      .from(pausedChannels)
      .where(eq(pausedChannels.channelId, channelId))
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }

    const [paused] = await db
      .insert(pausedChannels)
      .values({ channelId, guildId, channelName })
      .returning();
    return paused;
  }

  async resumeChannel(channelId: string): Promise<void> {
    await db
      .delete(pausedChannels)
      .where(eq(pausedChannels.channelId, channelId));
  }

  async isChannelPaused(channelId: string): Promise<boolean> {
    const [paused] = await db
      .select()
      .from(pausedChannels)
      .where(eq(pausedChannels.channelId, channelId))
      .limit(1);
    return !!paused;
  }

  async getPausedChannels(): Promise<PausedChannel[]> {
    return await db
      .select()
      .from(pausedChannels)
      .orderBy(desc(pausedChannels.pausedAt));
  }
}

export const storage = new DatabaseStorage();
