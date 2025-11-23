import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, MessageSquare, ThumbsUp, BookOpen, AlertCircle, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<{
    totalTickets: number;
    openTickets: number;
    respondedTickets: number;
    closedTickets: number;
    sentResponses: number;
    pendingResponses: number;
    totalTrainingEntries: number;
    satisfactionRate: number;
    highUrgencyTickets: number;
  }>({
    queryKey: ['/api/stats'],
    refetchInterval: 10000,
  });

  const { data: recentTickets } = useQuery<Array<{
    id: string;
    channelName: string;
    username: string;
    content: string;
    status: string;
    urgency: string | null;
    createdAt: string;
  }>>({
    queryKey: ['/api/tickets'],
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do bot de suporte com IA</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-tickets">{stats?.openTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalTickets || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respostas IA</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-sent-responses">{stats?.sentResponses || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingResponses || 0} aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-satisfaction">{stats?.satisfactionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Taxa de aprovação
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Base de Conhecimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-bold" data-testid="text-training-count">{stats?.totalTrainingEntries || 0}</div>
                <p className="text-sm text-muted-foreground">Entradas de treinamento</p>
              </div>
              <p className="text-sm">
                A IA usa esses dados para responder tickets automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Tickets Urgentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-bold text-destructive" data-testid="text-urgent-tickets">
                  {stats?.highUrgencyTickets || 0}
                </div>
                <p className="text-sm text-muted-foreground">Alta prioridade</p>
              </div>
              <p className="text-sm">
                Tickets que requerem atenção imediata.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentTickets || recentTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum ticket registrado ainda
            </p>
          ) : (
            <div className="space-y-4">
              {recentTickets.slice(0, 5).map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0"
                  data-testid={`ticket-${ticket.id}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {ticket.status === 'responded' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {ticket.username} • #{ticket.channelName}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.content}
                    </p>
                    <div className="flex gap-2">
                      {ticket.urgency && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            ticket.urgency === 'high'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : ticket.urgency === 'medium'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {ticket.urgency === 'high' ? 'Alta' : ticket.urgency === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      )}
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {ticket.status === 'open' ? 'Aberto' : ticket.status === 'responded' ? 'Respondido' : 'Fechado'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
