import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, Message } from 'discord.js';
import { storage } from './storage.js';
import { generateAIResponse, analyzeSentiment } from './openai-service.js';

const TICKET_CHANNEL_PATTERNS = ['ticket', 'suporte', 'ajuda', 'support', 'help'];

export class DiscordBot {
  private client: Client;
  private rest: REST;
  private isReady = false;
  private botUserId: string | null = null;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.once('ready', async () => {
      console.log(`✅ Bot Discord conectado como ${this.client.user?.tag}`);
      this.isReady = true;
      this.botUserId = this.client.user?.id || null;
      await this.registerCommands();
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await this.handleCommand(interaction);
      } else if (interaction.isButton()) {
        await this.handleButton(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.handleModal(interaction);
      }
    });

    this.client.on('messageCreate', async (message) => {
      await this.handleMessage(message);
    });

    this.client.on('messageReactionAdd', async (reaction, user) => {
      if (user.bot) return;
      await this.handleReaction(reaction, user, 'add');
    });
  }

  private async registerCommands() {
    const commands = [
      new SlashCommandBuilder()
        .setName('treinamento')
        .setDescription('Configurar e treinar a IA do bot de suporte')
        .toJSON(),
      new SlashCommandBuilder()
        .setName('config')
        .setDescription('Visualizar configurações do bot')
        .toJSON(),
      new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Ver estatísticas do bot')
        .toJSON(),
      new SlashCommandBuilder()
        .setName('pausar')
        .setDescription('Pausar respostas da IA (apenas admin)')
        .setDefaultMemberPermissions('0')
        .toJSON(),
      new SlashCommandBuilder()
        .setName('retomar')
        .setDescription('Retomar respostas da IA (apenas admin)')
        .setDefaultMemberPermissions('0')
        .toJSON(),
    ];

    try {
      console.log('🔄 Registrando comandos slash...');
      await this.rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
        { body: commands }
      );
      console.log('✅ Comandos registrados com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao registrar comandos:', error);
    }
  }

  private async handleCommand(interaction: any) {
    try {
      if (interaction.commandName === 'treinamento') {
        await this.handleTrainingCommand(interaction);
      } else if (interaction.commandName === 'config') {
        await this.handleConfigCommand(interaction);
      } else if (interaction.commandName === 'stats') {
        await this.handleStatsCommand(interaction);
      } else if (interaction.commandName === 'pausar') {
        await this.handlePauseCommand(interaction);
      } else if (interaction.commandName === 'retomar') {
        await this.handleResumeCommand(interaction);
      }
    } catch (error) {
      console.error('Erro ao processar comando:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'Ocorreu um erro ao processar o comando.',
          ephemeral: true,
        });
      }
    }
  }

  private async handleTrainingCommand(interaction: any) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🧠 Base de Memória da IA')
      .setDescription('Ensine à IA sobre assuntos. Ela memorizará e usará para responder perguntas relacionadas.')
      .addFields(
        { name: '📚 Assuntos Memorizados', value: `${(await storage.getKnowledgeEntries()).length}`, inline: true },
        { name: '🔍 Como Funciona', value: 'Você fornece o assunto + informações → IA memoriza → IA responde perguntas relacionadas', inline: false }
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('view_knowledge')
        .setLabel('📚 Ver Base de Memória')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  }

  private async handleConfigCommand(interaction: any) {
    const config = await storage.getBotConfig();
    
    if (!config) {
      await interaction.reply({
        content: '❌ Configuração não encontrada.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚙️ Configurações do Bot')
      .addFields(
        { name: '🤖 Resposta Automática', value: config.autoRespond ? '✅ Ativada' : '❌ Desativada', inline: true },
        { name: '✋ Requer Aprovação', value: config.requireApproval ? '✅ Sim' : '❌ Não', inline: true },
        { name: '⏱️ Delay de Resposta', value: `${config.responseDelay}ms`, inline: true },
        { name: '📊 Max Tokens', value: `${config.maxTokens}`, inline: true },
        { name: '💬 Prompt do Sistema', value: config.systemPrompt.substring(0, 100) + '...', inline: false },
        { name: '🔄 Mensagem Fallback', value: config.fallbackMessage, inline: false }
      );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  private async handleStatsCommand(interaction: any) {
    const tickets = await storage.getTickets();
    const responses = await storage.getBotResponses();
    const feedbacks = await storage.getFeedback();
    const knowledgeEntries = await storage.getKnowledgeEntries();

    const positiveFeedback = feedbacks.filter(f => f.rating >= 4).length;
    const totalFeedback = feedbacks.length;
    const satisfactionRate = totalFeedback > 0 ? ((positiveFeedback / totalFeedback) * 100).toFixed(1) : '0';

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('📊 Estatísticas do Bot')
      .addFields(
        { name: '🎫 Total de Tickets', value: `${tickets.length}`, inline: true },
        { name: '💬 Respostas Enviadas', value: `${responses.filter(r => r.status === 'sent').length}`, inline: true },
        { name: '⏳ Aguardando Aprovação', value: `${responses.filter(r => r.status === 'pending').length}`, inline: true },
        { name: '📚 Assuntos Memorizados', value: `${knowledgeEntries.length}`, inline: true },
        { name: '⭐ Taxa de Satisfação', value: `${satisfactionRate}%`, inline: true },
        { name: '👍 Feedbacks Positivos', value: `${positiveFeedback}/${totalFeedback}`, inline: true }
      );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  private async handlePauseCommand(interaction: any) {
    // Verificar permissão de admin
    if (!interaction.member?.permissions.has('Administrator')) {
      await interaction.reply({
        content: '❌ Apenas administradores podem pausar a IA.',
        ephemeral: true,
      });
      return;
    }

    const channelId = interaction.channelId;
    const guildId = interaction.guildId;
    const channelName = ('name' in interaction.channel ? interaction.channel.name : 'unknown') || 'unknown';

    await storage.pauseChannel(channelId, guildId, channelName);
    
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('⏸️ IA Pausada Neste Canal')
      .setDescription(`A IA parou de responder em #${channelName}. Um agente humano pode ajudar agora.\n\n⚠️ O bot continua respondendo em outros canais e servidores!`)
      .addFields(
        { name: '🔄 Para Retomar', value: 'Use `/retomar` neste canal', inline: false }
      );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

    console.log(`⏸️ IA pausada no canal ${channelName} (${channelId})`);
  }

  private async handleResumeCommand(interaction: any) {
    // Verificar permissão de admin
    if (!interaction.member?.permissions.has('Administrator')) {
      await interaction.reply({
        content: '❌ Apenas administradores podem retomar a IA.',
        ephemeral: true,
      });
      return;
    }

    const channelId = interaction.channelId;
    const channelName = ('name' in interaction.channel ? interaction.channel.name : 'unknown') || 'unknown';

    await storage.resumeChannel(channelId);
    
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('▶️ IA Retomada Neste Canal')
      .setDescription(`A IA voltou a responder em #${channelName}.`)
      .addFields(
        { name: '⏸️ Para Pausar', value: 'Use `/pausar` neste canal', inline: false }
      );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

    console.log(`▶️ IA retomada no canal ${channelName} (${channelId})`);
  }

  private async handleButton(interaction: any) {
    try {
      if (interaction.customId === 'view_knowledge') {
        await this.openKnowledgeLink(interaction);
      } else if (interaction.customId.startsWith('approve_')) {
        const responseId = interaction.customId.replace('approve_', '');
        await this.approveResponse(interaction, responseId);
      } else if (interaction.customId.startsWith('reject_')) {
        const responseId = interaction.customId.replace('reject_', '');
        await this.rejectResponse(interaction, responseId);
      }
    } catch (error) {
      console.error('Erro ao processar botão:', error);
    }
  }

  private async openKnowledgeLink(interaction: any) {
    const entries = await storage.getKnowledgeEntries();
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🧠 Base de Memória da IA')
      .setDescription(`Acesse o painel de administração para gerenciar a base de memória da IA.\n\n**Assuntos Cadastrados:** ${entries.length}`)
      .addFields({
        name: '📊 Acesse o Painel',
        value: 'Clique no botão abaixo para acessar o painel de administração.',
        inline: false,
      });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Abrir Painel')
        .setStyle(ButtonStyle.Link)
        .setURL(`${process.env.APP_URL || 'http://localhost:5000'}/training`)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  }

  private async handleModal(interaction: any) {
    // Modal handling can be added here if needed in the future
    await interaction.reply({
      content: 'Modal recebido',
      ephemeral: true,
    });
  }

  private isGreeting(text: string): boolean {
    const greetings = [
      'oi', 'olá', 'opa', 'hey', 'e aí', 'e ai', 'oi tudo bem',
      'olá tudo bem', 'tudo bem', 'tudo bom', 'e então', 'oiii',
      'ólá', 'alô', 'alo', 'salve', 'e aê', 'eae'
    ];
    
    const lowerText = text.toLowerCase().trim();
    
    // Se a mensagem é APENAS uma saudação (ou saudação com pontuação)
    for (const greeting of greetings) {
      if (lowerText === greeting || 
          lowerText === greeting + '!' ||
          lowerText === greeting + '?' ||
          lowerText === greeting + '...' ||
          lowerText === greeting + '?!') {
        return true;
      }
    }
    
    return false;
  }

  private async handleMessage(message: Message) {
    // Ignorar mensagens do próprio bot
    if (message.author.id === this.botUserId) return;
    
    // Ignorar mensagens de outros bots
    if (message.author.bot) return;

    try {
      const config = await storage.getBotConfig();
      if (!config || !config.autoRespond) return;

      // Verificar se o canal está pausado
      const isChannelPaused = await storage.isChannelPaused(message.channel.id);
      if (isChannelPaused) return;

      // Criar registro do ticket
      const ticket = await storage.createTicket({
        channelId: message.channel.id,
        channelName: 'name' in message.channel ? (message.channel.name || 'unknown') : 'unknown',
        userId: message.author.id,
        username: message.author.username,
        content: message.content,
        sentiment: null,
        urgency: null,
        status: 'open',
      });

      // Analisar sentimento (se habilitado)
      let ticketWithSentiment = ticket;
      try {
        const sentiment = await analyzeSentiment(message.content);
        await storage.updateTicketSentiment(ticket.id, sentiment.sentiment, sentiment.urgency);
        ticketWithSentiment = {
          ...ticket,
          sentiment: sentiment.sentiment,
          urgency: sentiment.urgency,
        };
      } catch (error) {
        console.error('Erro ao analisar sentimento:', error);
        // Fallback: define sentimento padrão
        await storage.updateTicketSentiment(ticket.id, 'neutral', 'medium');
        ticketWithSentiment = {
          ...ticket,
          sentiment: 'neutral',
          urgency: 'medium',
        };
      }

      // Gerar resposta da IA usando base de memória com semantic search
      const knowledgeEntries = await storage.getKnowledgeEntries();
      const aiResponse = await generateAIResponse(message.content, knowledgeEntries, config);

      // Criar registro da resposta
      const botResponse = await storage.createBotResponse({
        ticketId: ticket.id,
        content: aiResponse,
        status: config.requireApproval ? 'pending' : 'approved',
      });

      // Se requer aprovação, notificar em canal específico ou enviar para aprovação
      if (config.requireApproval) {
        // Por enquanto, vamos apenas logar
        console.log(`⏳ Resposta aguardando aprovação: ${botResponse.id}`);
      } else {
        // Enviar resposta automaticamente
        await this.sendResponse(message, aiResponse, botResponse.id, ticketWithSentiment.id);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  }

  private async sendResponse(message: Message, content: string, responseId: string, ticketId: string) {
    try {
      const config = await storage.getBotConfig();
      
      // Aplicar delay configurado
      if (config?.responseDelay) {
        await new Promise(resolve => setTimeout(resolve, config.responseDelay));
      }

      // Discord tem limite de 2000 caracteres por mensagem
      let responseContent = content;
      if (responseContent.length > 1950) {
        responseContent = responseContent.substring(0, 1950) + '\n\n... (mensagem truncada)';
      }

      const sentMessage = await message.reply(responseContent);
      
      // Adicionar reações para feedback
      await sentMessage.react('👍');
      await sentMessage.react('👎');

      // Marcar como enviada e armazenar message ID
      await storage.updateResponseWithMessageId(responseId, sentMessage.id);
      await storage.markResponseSent(responseId);
      await storage.updateTicketStatus(ticketId, 'responded');

      console.log(`✅ Resposta enviada para ticket no canal ${message.channel.id}`);
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
    }
  }

  private async approveResponse(interaction: any, responseId: string) {
    try {
      const responses = await storage.getBotResponses();
      const botResponse = responses.find(r => r.id === responseId);

      if (!botResponse) {
        await interaction.reply({
          content: '❌ Resposta não encontrada.',
          ephemeral: true,
        });
        return;
      }

      const ticket = await storage.getTicket(botResponse.ticketId);
      if (!ticket) {
        await interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true,
        });
        return;
      }

      // Atualizar status para approved primeiro
      await storage.updateResponseStatus(responseId, 'approved');

      // Buscar canal e enviar resposta
      const channel = await this.client.channels.fetch(ticket.channelId);
      if (channel && channel.isTextBased()) {
        const sentMessage = await channel.send(botResponse.content);
        
        // Adicionar reações para feedback
        await sentMessage.react('👍');
        await sentMessage.react('👎');

        // Marcar como enviada
        await storage.updateResponseWithMessageId(responseId, sentMessage.id);
        await storage.markResponseSent(responseId);
        await storage.updateTicketStatus(ticket.id, 'responded');

        await interaction.reply({
          content: '✅ Resposta aprovada e enviada!',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: '❌ Canal não encontrado.',
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error('Erro ao aprovar resposta:', error);
      await interaction.reply({
        content: '❌ Erro ao enviar resposta aprovada.',
        ephemeral: true,
      });
    }
  }

  private async rejectResponse(interaction: any, responseId: string) {
    await storage.updateResponseStatus(responseId, 'rejected');
    
    await interaction.reply({
      content: '❌ Resposta rejeitada.',
      ephemeral: true,
    });
  }

  private async handleReaction(reaction: any, user: any, action: 'add' | 'remove') {
    // Verificar se é feedback em uma mensagem do bot
    if (reaction.message.author?.id !== this.botUserId) return;

    const emoji = reaction.emoji.name;
    if (emoji !== '👍' && emoji !== '👎') return;

    const rating = emoji === '👍' ? 5 : 1;

    try {
      // Buscar a resposta do bot relacionada a este message ID
      const responses = await storage.getBotResponses();
      const botResponse = responses.find(r => r.messageId === reaction.message.id);

      if (botResponse) {
        await storage.createFeedback({
          responseId: botResponse.id,
          ticketId: botResponse.ticketId,
          userId: user.id,
          rating,
        });

        console.log(`📊 Feedback recebido: ${emoji} do usuário ${user.id}`);
      }
    } catch (error) {
      console.error('Erro ao processar feedback:', error);
    }
  }

  private isTicketChannel(channel: any): boolean {
    if (channel.type !== ChannelType.GuildText) return false;
    
    const channelName = channel.name?.toLowerCase() || '';
    return TICKET_CHANNEL_PATTERNS.some(pattern => channelName.includes(pattern));
  }

  public async start() {
    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      console.error('❌ Erro ao iniciar bot Discord:', error);
      throw error;
    }
  }

  public getStatus() {
    return {
      ready: this.isReady,
      username: this.client.user?.username || null,
      serverCount: this.client.guilds.cache.size,
    };
  }
}

export const discordBot = new DiscordBot();
