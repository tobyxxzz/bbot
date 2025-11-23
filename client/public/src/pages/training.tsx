import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type KnowledgeEntry = {
  id: string;
  subject: string;
  information: string;
  createdAt: string;
};

export default function Training() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    subject: "",
    information: "",
  });

  const { data: entries, isLoading } = useQuery<KnowledgeEntry[]>({
    queryKey: ['/api/knowledge'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { subject: string; information: string }) => {
      return await apiRequest('POST', '/api/knowledge', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setFormData({ subject: "", information: "" });
      toast({
        title: "Sucesso!",
        description: "Conhecimento adicionado à base de memória da IA.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar o conhecimento.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/knowledge/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Removido",
        description: "Conhecimento removido da base de memória.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.information) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o assunto e a informação antes de adicionar.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const filteredEntries = entries?.filter(entry =>
    entry.subject.toLowerCase().includes(search.toLowerCase()) ||
    entry.information.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">🧠 Base de Memória da IA</h1>
        <p className="text-muted-foreground mt-2">
          Ensine à IA sobre assuntos específicos. Ela memorizará as informações e usará para responder perguntas relacionadas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>➕ Adicionar Conhecimento</CardTitle>
          <CardDescription>
            Forneça um assunto e informações detalhadas. A IA aprenderá e usará isso para responder perguntas similares.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                placeholder="Ex: Política de Reembolso, Instruções de Instalação, etc."
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                data-testid="input-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="information">Informação Detalhada</Label>
              <Textarea
                id="information"
                placeholder="Forneça informações completas, procedimentos, políticas ou instruções que a IA deve memorizar e usar para responder perguntas sobre este assunto..."
                value={formData.information}
                onChange={(e) => setFormData({ ...formData, information: e.target.value })}
                className="min-h-40"
                data-testid="textarea-information"
              />
            </div>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              data-testid="button-add-knowledge"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createMutation.isPending ? "Adicionando..." : "Adicionar Conhecimento"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>📚 Base de Conhecimento</CardTitle>
              <CardDescription>
                {entries?.length || 0} assuntos memorizados
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
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
          ) : !filteredEntries || filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {search ? "Nenhum resultado encontrado" : "Nenhum conhecimento cadastrado ainda. Comece adicionando um assunto acima!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <Card key={entry.id} data-testid={`knowledge-entry-${entry.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <CardTitle className="text-base">📌 {entry.subject}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(entry.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.information}</p>
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
