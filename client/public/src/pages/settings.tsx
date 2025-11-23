import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

type BotConfig = {
  id: string;
  autoRespond: boolean;
  requireApproval: boolean;
  responseDelay: number;
  maxTokens: number;
  systemPrompt: string;
  fallbackMessage: string;
  updatedAt: string;
};

export default function Settings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<BotConfig>>({});

  const { data: config, isLoading } = useQuery<BotConfig>({
    queryKey: ['/api/config'],
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<BotConfig>) => {
      return await apiRequest('PATCH', '/api/config', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/config'] });
      toast({
        title: "Configurações salvas!",
        description: "As alterações foram aplicadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-settings-title">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize o comportamento do bot de IA
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Comportamento do Bot</CardTitle>
            <CardDescription>
              Configure como o bot deve responder aos tickets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="autoRespond">Resposta Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Bot responde automaticamente aos tickets
                </p>
              </div>
              <Switch
                id="autoRespond"
                checked={formData.autoRespond || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autoRespond: checked })
                }
                data-testid="switch-auto-respond"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="requireApproval">Requer Aprovação</Label>
                <p className="text-sm text-muted-foreground">
                  Respostas devem ser aprovadas antes de serem enviadas
                </p>
              </div>
              <Switch
                id="requireApproval"
                checked={formData.requireApproval || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requireApproval: checked })
                }
                data-testid="switch-require-approval"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseDelay">Delay de Resposta (ms)</Label>
              <Input
                id="responseDelay"
                type="number"
                min="0"
                step="100"
                value={formData.responseDelay || 0}
                onChange={(e) =>
                  setFormData({ ...formData, responseDelay: parseInt(e.target.value) })
                }
                data-testid="input-response-delay"
              />
              <p className="text-sm text-muted-foreground">
                Tempo de espera antes de enviar a resposta
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min="100"
                max="4000"
                step="50"
                value={formData.maxTokens || 500}
                onChange={(e) =>
                  setFormData({ ...formData, maxTokens: parseInt(e.target.value) })
                }
                data-testid="input-max-tokens"
              />
              <p className="text-sm text-muted-foreground">
                Limite de tokens para respostas da IA
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompts e Mensagens</CardTitle>
            <CardDescription>
              Personalize como a IA se comunica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">Prompt do Sistema</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt || ""}
                onChange={(e) =>
                  setFormData({ ...formData, systemPrompt: e.target.value })
                }
                className="min-h-32"
                data-testid="input-system-prompt"
              />
              <p className="text-sm text-muted-foreground">
                Instruções que definem o comportamento da IA
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fallbackMessage">Mensagem Fallback</Label>
              <Textarea
                id="fallbackMessage"
                value={formData.fallbackMessage || ""}
                onChange={(e) =>
                  setFormData({ ...formData, fallbackMessage: e.target.value })
                }
                className="min-h-24"
                data-testid="input-fallback-message"
              />
              <p className="text-sm text-muted-foreground">
                Mensagem quando a IA não sabe como responder
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData(config || {})}
            disabled={updateMutation.isPending}
            data-testid="button-reset-settings"
          >
            Resetar
          </Button>
        </div>
      </form>
    </div>
  );
}
