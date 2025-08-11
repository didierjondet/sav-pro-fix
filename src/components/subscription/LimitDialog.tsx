import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, Crown, Zap, Star, X, ArrowRight } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

interface LimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'upgrade_plan' | 'buy_sms_package' | 'contact_support';
  reason: string;
  limitType: 'sav' | 'sms';
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  sav_limit: number | null;
  sms_limit: number;
  features: any; // JSON field from Supabase
  is_active: boolean;
  stripe_price_id: string | null;
}

export function LimitDialog({ 
  open, 
  onOpenChange, 
  action, 
  reason, 
  limitType 
}: LimitDialogProps) {
  const { subscription, createCheckout } = useSubscription();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPlans();
    }
  }, [open]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan.name.toLowerCase() === 'gratuit' || plan.monthly_price === 0) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    try {
      const planKey = plan.name.toLowerCase() as 'premium' | 'enterprise';
      await createCheckout(planKey);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating checkout:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLimit = () => {
    if (limitType === 'sav') {
      const currentPlan = plans.find(p => p.name.toLowerCase() === subscription?.subscription_tier?.toLowerCase());
      return currentPlan?.sav_limit || 5;
    }
    return subscription?.sms_credits_allocated || 15;
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('gratuit') || name.includes('free')) {
      return <Star className="h-6 w-6 text-gray-500" />;
    }
    if (name.includes('premium')) {
      return <Crown className="h-6 w-6 text-blue-500" />;
    }
    if (name.includes('enterprise')) {
      return <Zap className="h-6 w-6 text-purple-500" />;
    }
    return <Star className="h-6 w-6 text-gray-500" />;
  };

  const getPlanColor = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('gratuit') || name.includes('free')) {
      return 'border-gray-200 bg-white';
    }
    if (name.includes('premium')) {
      return 'border-blue-200 bg-blue-50/50';
    }
    if (name.includes('enterprise')) {
      return 'border-purple-200 bg-purple-50/50';
    }
    return 'border-gray-200 bg-white';
  };

  const isCurrentPlan = (planName: string) => {
    return planName.toLowerCase() === subscription?.subscription_tier?.toLowerCase();
  };

  const isPlanUpgrade = (planPrice: number) => {
    const currentPlan = plans.find(p => p.name.toLowerCase() === subscription?.subscription_tier?.toLowerCase());
    const currentPrice = currentPlan?.monthly_price || 0;
    return planPrice > currentPrice;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900">
                  Limite atteinte !
                </DialogTitle>
                <Badge 
                  variant="outline" 
                  className="mt-1 border-orange-300 text-orange-700"
                >
                  Plan {subscription?.subscription_tier || 'gratuit'}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <DialogDescription className="text-base text-orange-800 font-medium">
              Vous ne pouvez pas dépasser la limite de votre plan actuel qui est de{' '}
              <span className="font-bold">{getCurrentLimit()} {limitType === 'sav' ? 'SAV simultanés' : 'SMS'}</span>.
            </DialogDescription>
            <p className="text-sm text-orange-600 mt-2">
              Choisissez un plan supérieur pour augmenter vos limites et débloquer plus de fonctionnalités.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Choisissez votre plan
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative transition-all duration-200 hover:shadow-lg ${getPlanColor(plan.name)} ${
                    isCurrentPlan(plan.name) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {isCurrentPlan(plan.name) && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white">Plan actuel</Badge>
                    </div>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getPlanIcon(plan.name)}
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-slate-900">
                        {plan.monthly_price === 0 ? 'Gratuit' : `${plan.monthly_price}€`}
                      </span>
                      {plan.monthly_price > 0 && (
                        <span className="text-slate-600 text-sm">/mois</span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-slate-600 mt-1">{plan.description}</p>
                    )}
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {plan.sav_limit ? `${plan.sav_limit} SAV simultanés` : 'SAV illimités'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{plan.sms_limit} SMS/mois</span>
                      </div>

                      {plan.features && plan.features.length > 0 && (
                        <div className="space-y-1">
                          {plan.features.slice(0, 3).map((feature, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      {isCurrentPlan(plan.name) ? (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          disabled
                        >
                          Plan actuel
                        </Button>
                      ) : isPlanUpgrade(plan.monthly_price) ? (
                        <Button
                          onClick={() => handleSelectPlan(plan)}
                          disabled={loading || !plan.stripe_price_id}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Choisir ce plan
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          disabled
                        >
                          Plan inférieur
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/support'}
              className="flex-1"
            >
              Contacter le support
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}