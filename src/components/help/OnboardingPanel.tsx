import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Rocket, ArrowRight, HelpCircle, PartyPopper, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOnboardingProgress, type OnboardingStep } from '@/hooks/useOnboardingProgress';

interface Props {
  onAskHelp: (question: string) => void;
  onClose?: () => void;
  defaultExpanded?: boolean;
}

const OnboardingPanel: React.FC<Props> = ({ onAskHelp, onClose, defaultExpanded }) => {
  const navigate = useNavigate();
  const {
    steps,
    doneCount,
    totalSteps,
    progressPercent,
    pendingCount,
    isFullyConfigured,
    markStepSeen,
  } = useOnboardingProgress();

  const [expanded, setExpanded] = useState(defaultExpanded ?? !isFullyConfigured);

  const handleGo = (step: OnboardingStep) => {
    if (step.manual) markStepSeen(step.id);
    navigate(step.actionRoute);
    onClose?.();
  };

  const handleHelp = (step: OnboardingStep) => {
    onAskHelp(step.helpQuestion);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 transition-colors text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {isFullyConfigured ? <PartyPopper className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">
              {isFullyConfigured ? 'Configuration terminée 🎉' : 'Configurez votre magasin'}
            </p>
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              {doneCount}/{totalSteps}
            </span>
          </div>
          <Progress value={progressPercent} className="h-1.5 mt-1.5" />
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-primary/20 bg-background/50 max-h-[260px] overflow-y-auto">
          {isFullyConfigured && (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Bravo ! Toutes les étapes sont validées. Vous pouvez relancer ce parcours à tout moment depuis l'icône d'assistance.
            </div>
          )}
          <ul className="divide-y divide-border/50">
            {steps.map(step => (
              <li key={step.id} className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  {step.status === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {step.label}
                    </p>
                    {step.status === 'pending' && (
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    )}
                  </div>
                </div>
                {step.status === 'pending' && (
                  <div className="flex gap-2 pl-6">
                    <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => handleGo(step)}>
                      {step.manual ? <Eye className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                      {step.manual ? 'Découvrir' : 'Y aller'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleHelp(step)}>
                      <HelpCircle className="h-3 w-3" />
                      Aide
                    </Button>
                    {step.manual && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => markStepSeen(step.id)}>
                        Marquer vu
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OnboardingPanel;
