import { type Express } from "express";
import { type Server } from "node:http";
import { createServer } from "node:http";
import { Router } from 'express';
import { z } from 'zod';
import { storage } from './storage.js';
import { insertKnowledgeBaseSchema } from '@shared/schema.js';
import { generateEmbedding } from './embeddings.js';

export async function registerRoutes(app: Express): Promise<Server> {
  const router = Router();

  // Knowledge Base Routes
  router.get('/api/knowledge', async (req, res) => {
    try {
      const entries = await storage.getKnowledgeEntries();
      res.json(entries);
    } catch (error) {
      console.error('Erro ao buscar conhecimento:', error);
      res.status(500).json({ error: 'Erro ao buscar conhecimento' });
    }
  });

  router.post('/api/knowledge', async (req, res) => {
    try {
      const parsed = insertKnowledgeBaseSchema.parse(req.body);
      
      // Generate embedding for the combined subject + information
      const textForEmbedding = `${parsed.subject} ${parsed.information}`;
      const embedding = await generateEmbedding(textForEmbedding);
      
      const entry = await storage.createKnowledgeEntry({
        ...parsed,
        embedding: JSON.stringify(embedding),
      });
      
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Erro ao criar conhecimento:', error);
        res.status(500).json({ error: 'Erro ao criar conhecimento' });
      }
    }
  });

  router.delete('/api/knowledge/:id', async (req, res) => {
    try {
      await storage.deleteKnowledgeEntry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao deletar conhecimento:', error);
      res.status(500).json({ error: 'Erro ao deletar conhecimento' });
    }
  });

  // Tickets Routes
  router.get('/api/tickets', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const tickets = await storage.getTickets(limit);
      res.json(tickets);
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      res.status(500).json({ error: 'Erro ao buscar tickets' });
    }
  });

  router.get('/api/tickets/:id', async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        res.status(404).json({ error: 'Ticket não encontrado' });
        return;
      }
      res.json(ticket);
    } catch (error) {
      console.error('Erro ao buscar ticket:', error);
      res.status(500).json({ error: 'Erro ao buscar ticket' });
    }
  });

  // Bot Responses Routes
  router.get('/api/bot-responses', async (req, res) => {
    try {
      const ticketId = req.query.ticketId as string | undefined;
      const responses = await storage.getBotResponses(ticketId);
      res.json(responses);
    } catch (error) {
      console.error('Erro ao buscar respostas do bot:', error);
      res.status(500).json({ error: 'Erro ao buscar respostas do bot' });
    }
  });

  router.get('/api/bot-responses/pending', async (req, res) => {
    try {
      const responses = await storage.getPendingResponses();
      res.json(responses);
    } catch (error) {
      console.error('Erro ao buscar respostas pendentes:', error);
      res.status(500).json({ error: 'Erro ao buscar respostas pendentes' });
    }
  });

  // Bot Config Routes
  router.get('/api/bot/status', async (req, res) => {
    try {
      const config = await storage.getBotConfig();
      res.json({
        ready: true,
        username: process.env.DISCORD_BOT_USERNAME || 'Unknown',
        config,
      });
    } catch (error) {
      console.error('Erro ao buscar status do bot:', error);
      res.status(500).json({ error: 'Erro ao buscar status do bot' });
    }
  });

  router.get('/api/stats', async (req, res) => {
    try {
      const [tickets, responses, feedbackList, knowledge] = await Promise.all([
        storage.getTickets(),
        storage.getBotResponses(),
        storage.getFeedback(),
        storage.getKnowledgeEntries(),
      ]);

      const openTickets = tickets.filter(t => t.status === 'open').length;
      const respondedTickets = tickets.filter(t => t.status === 'responded').length;
      const closedTickets = tickets.filter(t => t.status === 'closed').length;
      
      const positiveFeedback = feedbackList.filter(f => f.rating >= 4).length;
      const satisfactionRate = feedbackList.length > 0 
        ? ((positiveFeedback / feedbackList.length) * 100).toFixed(1)
        : '0';

      res.json({
        totalTickets: tickets.length,
        openTickets,
        respondedTickets,
        closedTickets,
        totalResponses: responses.length,
        totalFeedback: feedbackList.length,
        satisfactionRate: `${satisfactionRate}%`,
        knowledgeEntries: knowledge.length,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  });

  app.use(router);

  return createServer(app);
}
