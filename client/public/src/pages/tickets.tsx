import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";

type Ticket = {
  id: string;
  channelId: string;
  channelName: string;
  userId: string;
  username: string;
  content: string;
  sentiment: string | null;
  urgency: string | null;
  status: string;
  createdAt: string;
};

export default function Tickets() {
  const [search, setSearch] = useState("");

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ['/api/tickets'],
    refetchInterval: 5000,
  });

  const filteredTickets = tickets?.filter((ticket) =>
    search === "" ||
    ticket.username.toLowerCase().includes(search.toLowerCase()) ||
    ticket.channelName.toLowerCase().includes(search.toLowerCase()) ||
    ticket.content.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'responded':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'closed':
        return <CheckCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
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
        <h1 className="text-3xl font-bold" data-testid="text-tickets-title">Tickets</h1>
        <p className="text-muted-foreground">
          Histórico de tickets de suporte
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Todos os Tickets</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {tickets?.length || 0} tickets registrados
              </p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-tickets"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : !filteredTickets || filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {search ? "Nenhum ticket encontrado" : "Nenhum ticket registrado ainda"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <Card key={ticket.id} data-testid={`ticket-card-${ticket.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {getStatusIcon(ticket.status)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {ticket.username}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              #{ticket.channelName}
                            </p>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm">{ticket.content}</p>
                        <div className="flex gap-2">
                          {ticket.urgency && (
                            <Badge variant="outline" className={getUrgencyColor(ticket.urgency)}>
                              {ticket.urgency === 'high' ? 'Alta Urgência' : ticket.urgency === 'medium' ? 'Média Urgência' : 'Baixa Urgência'}
                            </Badge>
                          )}
                          {ticket.sentiment && (
                            <Badge variant="outline">
                              {ticket.sentiment === 'positive' ? '😊 Positivo' : ticket.sentiment === 'negative' ? '😠 Negativo' : '😐 Neutro'}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {ticket.status === 'open' ? 'Aberto' : ticket.status === 'responded' ? 'Respondido' : 'Fechado'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
