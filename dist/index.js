var __defProp = Object.defineProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index-prod.ts
import fs from "node:fs";
import path from "node:path";
import express2 from "express";

// server/app.ts
import express from "express";

// server/routes.ts
import { Router } from "express";
import { z } from "zod";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  botConfig: () => botConfig,
  botResponses: () => botResponses,
  feedback: () => feedback,
  insertBotConfigSchema: () => insertBotConfigSchema,
  insertBotResponseSchema: () => insertBotResponseSchema,
  insertFeedbackSchema: () => insertFeedbackSchema,
  insertKnowledgeBaseSchema: () => insertKnowledgeBaseSchema,
  insertTicketSchema: () => insertTicketSchema,
  knowledgeBase: () => knowledgeBase,
  tickets: () => tickets,
  updateBotConfigSchema: () => updateBotConfigSchema
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  // The topic/subject
  information: text("information").notNull(),
  // The detailed information admin provides
  embedding: text("embedding"),
  // Vector embedding for semantic search (stored as JSON string)
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  embedding: true
});
var tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: text("channel_id").notNull(),
  channelName: text("channel_name").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  content: text("content").notNull(),
  sentiment: text("sentiment"),
  // "positive", "neutral", "negative"
  urgency: text("urgency"),
  // "low", "medium", "high"
  status: text("status").notNull().default("open"),
  // "open", "responded", "closed"
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true
});
var botResponses = pgTable("bot_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  // "pending", "approved", "rejected", "sent"
  messageId: text("message_id"),
  // Discord message ID for feedback tracking
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertBotResponseSchema = createInsertSchema(botResponses).omit({
  id: true,
  createdAt: true,
  sentAt: true
});
var feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  responseId: varchar("response_id").notNull(),
  ticketId: varchar("ticket_id").notNull(),
  userId: text("user_id").notNull(),
  rating: integer("rating").notNull(),
  // 1 = thumbs down, 5 = thumbs up
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true
});
var botConfig = pgTable("bot_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  autoRespond: boolean("auto_respond").notNull().default(true),
  requireApproval: boolean("require_approval").notNull().default(false),
  responseDelay: integer("response_delay").notNull().default(2e3),
  // milliseconds
  maxTokens: integer("max_tokens").notNull().default(500),
  systemPrompt: text("system_prompt").notNull().default("You are a helpful support assistant. Use the knowledge base provided to answer questions accurately and professionally. If you find relevant knowledge, use it. Otherwise, search the internet."),
  fallbackMessage: text("fallback_message").notNull().default("I don't have enough information to answer that question. A human agent will assist you shortly."),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertBotConfigSchema = createInsertSchema(botConfig).omit({
  id: true,
  updatedAt: true
});
var updateBotConfigSchema = insertBotConfigSchema.partial();

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc } from "drizzle-orm";
var DatabaseStorage = class {
  // Knowledge Base
  async getKnowledgeEntries() {
    return await db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt));
  }
  async getKnowledgeEntry(id) {
    const [entry] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id));
    return entry || void 0;
  }
  async createKnowledgeEntry(insertEntry) {
    const [entry] = await db.insert(knowledgeBase).values(insertEntry).returning();
    return entry;
  }
  async deleteKnowledgeEntry(id) {
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
  }
  async updateKnowledgeEntryEmbedding(id, embedding) {
    await db.update(knowledgeBase).set({ embedding }).where(eq(knowledgeBase.id, id));
  }
  // Tickets
  async getTickets(limit) {
    const query = db.select().from(tickets).orderBy(desc(tickets.createdAt));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }
  async getTicket(id) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || void 0;
  }
  async getTicketsByChannel(channelId) {
    return await db.select().from(tickets).where(eq(tickets.channelId, channelId)).orderBy(desc(tickets.createdAt));
  }
  async createTicket(insertTicket) {
    const [ticket] = await db.insert(tickets).values(insertTicket).returning();
    return ticket;
  }
  async updateTicketStatus(id, status) {
    await db.update(tickets).set({ status }).where(eq(tickets.id, id));
  }
  async updateTicketSentiment(id, sentiment, urgency) {
    await db.update(tickets).set({ sentiment, urgency }).where(eq(tickets.id, id));
  }
  // Bot Responses
  async getBotResponses(ticketId) {
    if (ticketId) {
      return await db.select().from(botResponses).where(eq(botResponses.ticketId, ticketId)).orderBy(desc(botResponses.createdAt));
    }
    return await db.select().from(botResponses).orderBy(desc(botResponses.createdAt));
  }
  async getPendingResponses() {
    return await db.select().from(botResponses).where(eq(botResponses.status, "pending")).orderBy(botResponses.createdAt);
  }
  async createBotResponse(insertResponse) {
    const [response] = await db.insert(botResponses).values(insertResponse).returning();
    return response;
  }
  async updateResponseStatus(id, status) {
    await db.update(botResponses).set({ status }).where(eq(botResponses.id, id));
  }
  async markResponseSent(id) {
    await db.update(botResponses).set({ status: "sent", sentAt: /* @__PURE__ */ new Date() }).where(eq(botResponses.id, id));
  }
  async updateResponseWithMessageId(id, messageId) {
    await db.update(botResponses).set({ messageId }).where(eq(botResponses.id, id));
  }
  // Feedback
  async getFeedback(responseId) {
    if (responseId) {
      return await db.select().from(feedback).where(eq(feedback.responseId, responseId)).orderBy(desc(feedback.createdAt));
    }
    return await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  }
  async createFeedback(insertFeedback) {
    const [fb] = await db.insert(feedback).values(insertFeedback).returning();
    return fb;
  }
  // Bot Config
  async getBotConfig() {
    const [config] = await db.select().from(botConfig).limit(1);
    if (!config) {
      return await this.createBotConfig({
        autoRespond: true,
        requireApproval: false,
        responseDelay: 2e3,
        maxTokens: 500,
        systemPrompt: "You are a helpful support assistant. Use the knowledge base provided to answer questions accurately and professionally.",
        fallbackMessage: "I don't have enough information to answer that question. A human agent will assist you shortly."
      });
    }
    return config;
  }
  async createBotConfig(insertConfig) {
    const [config] = await db.insert(botConfig).values(insertConfig).returning();
    return config;
  }
  async updateBotConfig(updateConfig) {
    const existing = await this.getBotConfig();
    if (!existing) {
      throw new Error("Config not found");
    }
    const [updated] = await db.update(botConfig).set({
      ...updateConfig,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(botConfig.id, existing.id)).returning();
    return updated;
  }
};
var storage = new DatabaseStorage();

// server/embeddings.ts
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
async function generateEmbedding(text2) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text2
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// server/routes.ts
async function registerRoutes(app2) {
  const router = Router();
  router.get("/api/knowledge", async (req, res) => {
    try {
      const entries = await storage.getKnowledgeEntries();
      res.json(entries);
    } catch (error) {
      console.error("Erro ao buscar conhecimento:", error);
      res.status(500).json({ error: "Erro ao buscar conhecimento" });
    }
  });
  router.post("/api/knowledge", async (req, res) => {
    try {
      const parsed = insertKnowledgeBaseSchema.parse(req.body);
      const textForEmbedding = `${parsed.subject} ${parsed.information}`;
      const embedding = await generateEmbedding(textForEmbedding);
      const entry = await storage.createKnowledgeEntry({
        ...parsed,
        embedding: JSON.stringify(embedding)
      });
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Erro ao criar conhecimento:", error);
        res.status(500).json({ error: "Erro ao criar conhecimento" });
      }
    }
  });
  router.delete("/api/knowledge/:id", async (req, res) => {
    try {
      await storage.deleteKnowledgeEntry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao deletar conhecimento:", error);
      res.status(500).json({ error: "Erro ao deletar conhecimento" });
    }
  });
  router.get("/api/tickets", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
      const tickets2 = await storage.getTickets(limit);
      res.json(tickets2);
    } catch (error) {
      console.error("Erro ao buscar tickets:", error);
      res.status(500).json({ error: "Erro ao buscar tickets" });
    }
  });
  router.get("/api/tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        res.status(404).json({ error: "Ticket n\xE3o encontrado" });
        return;
      }
      res.json(ticket);
    } catch (error) {
      console.error("Erro ao buscar ticket:", error);
      res.status(500).json({ error: "Erro ao buscar ticket" });
    }
  });
  router.get("/api/bot-responses", async (req, res) => {
    try {
      const ticketId = req.query.ticketId;
      const responses = await storage.getBotResponses(ticketId);
      res.json(responses);
    } catch (error) {
      console.error("Erro ao buscar respostas do bot:", error);
      res.status(500).json({ error: "Erro ao buscar respostas do bot" });
    }
  });
  router.get("/api/bot-responses/pending", async (req, res) => {
    try {
      const responses = await storage.getPendingResponses();
      res.json(responses);
    } catch (error) {
      console.error("Erro ao buscar respostas pendentes:", error);
      res.status(500).json({ error: "Erro ao buscar respostas pendentes" });
    }
  });
  router.get("/api/bot/status", async (req, res) => {
    try {
      const config = await storage.getBotConfig();
      res.json({
        ready: true,
        username: process.env.DISCORD_BOT_USERNAME || "Unknown",
        config
      });
    } catch (error) {
      console.error("Erro ao buscar status do bot:", error);
      res.status(500).json({ error: "Erro ao buscar status do bot" });
    }
  });
  router.get("/api/stats", async (req, res) => {
    try {
      const [tickets2, responses, feedbackList, knowledge] = await Promise.all([
        storage.getTickets(),
        storage.getBotResponses(),
        storage.getFeedback(),
        storage.getKnowledgeEntries()
      ]);
      const openTickets = tickets2.filter((t) => t.status === "open").length;
      const respondedTickets = tickets2.filter((t) => t.status === "responded").length;
      const closedTickets = tickets2.filter((t) => t.status === "closed").length;
      const positiveFeedback = feedbackList.filter((f) => f.rating >= 4).length;
      const satisfactionRate = feedbackList.length > 0 ? (positiveFeedback / feedbackList.length * 100).toFixed(1) : "0";
      res.json({
        totalTickets: tickets2.length,
        openTickets,
        respondedTickets,
        closedTickets,
        totalResponses: responses.length,
        totalFeedback: feedbackList.length,
        satisfactionRate: `${satisfactionRate}%`,
        knowledgeEntries: knowledge.length
      });
    } catch (error) {
      console.error("Erro ao buscar estat\xEDsticas:", error);
      res.status(500).json({ error: "Erro ao buscar estat\xEDsticas" });
    }
  });
  app2.use(router);
  return __require("node:http").createServer(app2);
}

// server/app.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
var app = express();
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function runApp(setup) {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  await setup(app, server);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
}

// server/index-prod.ts
async function serveStatic(app2, _server) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
(async () => {
  await runApp(serveStatic);
})();
export {
  serveStatic
};
