import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";

type PendingResponse = {
  id: string;
  ticketId: string;
  content: string;
  status: string;
  createdAt: string;
};

type Ticket = {
  id: string;
  channelName: string;
  username: string;
  content: string;
  urgency: string | null;
};

export default function Approvals() {
  const { toast } = useToast();

  const { data: pendingResponses, isLoading } = useQuery<PendingResponse[]>({
    queryKey: ['/api/responses/pending'],
    refetchInterval: 5000,
  });

  const { data: tickets } = useQuery<Ticket[]>({
    queryKey: ['/api/tickets'],
  });

  const approveMutation = useMutation({
    mutationFn: async (responseId: string) => {
      return await apiRequest('PATCH', `/api/responses/${responseId}/approve`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/responses/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/responses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Resposta aprovada!",
        description: "A resposta será enviada ao canal.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aprovar a resposta.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (responseId: string) => {
      return await apiRequest('PATCH', `/api/responses/${responseId}/reject`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/responses/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/responses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Resposta rejeitada",
        description: "A resposta foi descartada.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível rejeitar a resposta.",
        variant: "destructive",
      });
    },
  });

  const getTicketInfo = (ticketId: string) => {
    return tickets?.find((t) => t.id === ticketId);
  };

  const getUrgencyColor = (urgency: string | null) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-approvals-title">Aprovações</h1>
        <p className="text-muted-foreground">
          Revise e aprove respostas geradas pela IA antes de serem enviadas
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Respostas Aguardando Aprovação
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {pendingResponses?.length || 0} respostas pendentes
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : !pendingResponses || pendingResponses.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-medium">Tudo aprovado!</p>
              <p className="text-sm text-muted-foreground">
                Não há respostas aguardando aprovação no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingResponses.map((response) => {
                const ticket = getTicketInfo(response.ticketId);
                return (
                  <Card key={response.id} data-testid={`approval-card-${response.id}`}>
                    <CardHeader>
                      <div className="space-y-4">
                        {ticket && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{ticket.username}</p>
                                <span className="text-sm text-muted-foreground">
                                  #{ticket.channelName}
                                </span>
                              </div>
                              {ticket.urgency && (
                                <Badge variant="outline" className={getUrgencyColor(ticket.urgency)}>
                                  {ticket.urgency === 'high' ? 'Alta' : ticket.urgency === 'medium' ? 'Média' : 'Baixa'} Urgência
                                </Badge>
                              )}
                            </div>
                            <div className="rounded-md bg-muted p-4">
                              <p className="text-sm font-medium text-muted-foreground mb-1">
                                Mensagem Original:
                              </p>
                              <p className="text-sm">{ticket.content}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          <p className="text-sm font-medium">Resposta Gerada pela IA:</p>
                        </div>
                        <div className="rounded-md border bg-card p-4">
                          <p className="text-sm whitespace-pre-wrap">{response.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          Gerada em {new Date(response.createdAt).toLocaleString('pt-BR')}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => rejectMutation.mutate(response.id)}
                            disabled={rejectMutation.isPending || approveMutation.isPending}
                            data-testid={`button-reject-${response.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Rejeitar
                          </Button>
                          <Button
                            onClick={() => approveMutation.mutate(response.id)}
                            disabled={rejectMutation.isPending || approveMutation.isPending}
                            data-testid={`button-approve-${response.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprovar e Enviar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
