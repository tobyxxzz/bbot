import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, BookOpen } from "lucide-react";
import { useState } from "react";

type TrainingEntry = {
  id: string;
  question: string;
  response: string;
  category: string;
  createdAt: string;
};

export default function Knowledge() {
  const [search, setSearch] = useState("");

  const { data: entries, isLoading } = useQuery<TrainingEntry[]>({
    queryKey: ['/api/training'],
  });

  const filteredEntries = entries?.filter((entry) =>
    search === "" ||
    entry.question.toLowerCase().includes(search.toLowerCase()) ||
    entry.response.toLowerCase().includes(search.toLowerCase()) ||
    entry.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(
    new Set(filteredEntries?.map((e) => e.category) || [])
  );

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-knowledge-title">Base de Conhecimento</h1>
        <p className="text-muted-foreground">
          Explore o conhecimento que a IA usa para responder tickets
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Conhecimentos por Categoria</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {entries?.length || 0} entradas • {categories.length} categorias
              </p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar conhecimento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-knowledge"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : !filteredEntries || filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {search ? "Nenhum conhecimento encontrado" : "Nenhum conhecimento cadastrado ainda"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => {
                const categoryEntries = filteredEntries.filter(
                  (e) => e.category === category
                );
                return (
                  <div key={category}>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        {category}
                        <span className="text-sm text-muted-foreground font-normal">
                          ({categoryEntries.length})
                        </span>
                      </h3>
                    </div>
                    <Accordion type="multiple" className="space-y-2">
                      {categoryEntries.map((entry) => (
                        <AccordionItem
                          key={entry.id}
                          value={entry.id}
                          className="border rounded-lg px-4"
                          data-testid={`knowledge-item-${entry.id}`}
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="text-left">
                              <p className="font-medium">{entry.question}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pt-2 pb-4 space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Resposta:
                              </p>
                              <p className="text-sm">{entry.response}</p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
