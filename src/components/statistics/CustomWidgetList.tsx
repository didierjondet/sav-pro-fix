import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, FileText, Edit, Trash, ChevronDown } from 'lucide-react';

interface CustomWidget {
  id: string;
  name: string;
  description: string;
  original_prompt: string;
  enabled: boolean;
  widget_type: string;
}

interface CustomWidgetListProps {
  widgets: CustomWidget[];
  onEdit: (widget: CustomWidget) => void;
  onDelete: (widgetId: string) => void;
  onToggle: (widgetId: string, enabled: boolean) => void;
}

export const CustomWidgetList = ({ widgets, onEdit, onDelete, onToggle }: CustomWidgetListProps) => {
  if (widgets.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Aucun widget personnalisé créé pour le moment.</p>
        <p className="text-sm mt-1">Cliquez sur "Créer un widget" pour commencer.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {widgets.map((widget) => (
        <Card 
          key={widget.id} 
          className={`transition-all ${widget.enabled ? 'border-primary/50' : 'opacity-60'}`}
        >
          <CardHeader className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  <span className="truncate">{widget.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    IA
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {widget.widget_type}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm mt-1 line-clamp-2">
                  {widget.description}
                </CardDescription>
                
                {/* Prompt original */}
                <Collapsible className="mt-2">
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-auto py-1 px-2 text-xs"
                    >
                      <FileText className="mr-1 h-3 w-3" />
                      Voir le prompt
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-3 bg-muted/50 rounded text-xs italic">
                      "{widget.original_prompt}"
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Switch enabled/disabled */}
                <Switch
                  checked={widget.enabled}
                  onCheckedChange={(checked) => onToggle(widget.id, checked)}
                  aria-label="Activer/Désactiver le widget"
                />
                
                {/* Bouton modifier */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(widget)}
                  title="Modifier le prompt"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                {/* Bouton supprimer */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(widget.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Supprimer le widget"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};