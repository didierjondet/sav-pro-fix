import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Loader2, Crown, Zap, Infinity, MessageSquare, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
export default function Subscription() {
  const {
    user
  } = useAuth();
  const {
    subscription,
    loading,
    createCheckout,
    openCustomerPortal,
    checkSubscription
  } = useSubscription();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  // Plans chargés depuis la base de données (gérée par le superuser)
  const [plans, setPlans] = useState<any[]>([]);
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        console.log('🔄 Chargement des plans depuis la base (gérée par superuser)...');
        const { data: dbPlans, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('monthly_price');
        
        if (error) {
          console.error('❌ Erreur lors du chargement des plans:', error);
          return;
        }

        if (dbPlans) {
          console.log('✅ Plans chargés depuis superuser:', dbPlans);
          const formattedPlans = dbPlans.map(plan => ({
            id: plan.name.toLowerCase(),
            name: plan.name,
            price: plan.monthly_price === 0 ? 'Gratuit' : `${plan.monthly_price}€`,
            period: plan.monthly_price > 0 ? (plan.billing_interval === 'year' ? '/an HT' : '/mois HT') : '',
            icon: plan.name.toLowerCase().includes('enterprise') ? Infinity : 
                  plan.name.toLowerCase().includes('premium') ? Crown : CheckCircle,
            features: Array.isArray(plan.features) ? plan.features.map(f => String(f)) : [],
            limits: {
              sav: plan.sav_limit || 999999,
              sms: plan.sms_limit || 0
            },
            contact_only: plan.contact_only || false
          }));
          setPlans(formattedPlans);
        }
      } catch (error) {
        console.error('💥 Erreur lors du chargement des plans:', error);
      }
    };
    fetchPlans();
  }, []);
  const getCurrentPlan = () => {
    return plans.find(plan => plan.id === subscription?.subscription_tier) || plans[0];
  };
  const isCurrentPlan = (planId: string) => {
    return subscription?.subscription_tier === planId;
  };
  const canUpgrade = (planId: string) => {
    if (!subscription) return false;
    const currentIndex = plans.findIndex(p => p.id === subscription.subscription_tier);
    const targetIndex = plans.findIndex(p => p.id === planId);
    return targetIndex > currentIndex;
  };
  const getUsageColor = (used: number, limit: number) => {
    const percentage = used / limit * 100;
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 75) return 'text-orange-500';
    return 'text-green-500';
  };
  if (loading) {
    return <div className="min-h-screen flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} isMobileMenuOpen={sidebarOpen} />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </main>
        </div>
      </div>;
  }
  const currentPlan = getCurrentPlan();
  return <div className="min-h-screen flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} isMobileMenuOpen={sidebarOpen} />
        <main className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Abonnement MySAV</h1>
              <p className="text-muted-foreground">Gérez votre abonnement et consultez votre utilisation</p>
            </div>
            {subscription?.subscribed && <Button onClick={openCustomerPortal} variant="outline">
                Gérer l'abonnement
              </Button>}
          </div>

          {subscription && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <currentPlan.icon className="h-5 w-5" />
                    Plan Actuel
                  </CardTitle>
                  <CardDescription>{currentPlan.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">SAV Actifs</span>
                        <span className={`text-sm font-medium ${getUsageColor(subscription.active_sav_count, currentPlan.limits.sav)}`}>
                          {subscription.active_sav_count}/{currentPlan.limits.sav === 999999 ? '∞' : currentPlan.limits.sav}
                        </span>
                      </div>
                      {currentPlan.limits.sav !== 999999 && <Progress value={subscription.active_sav_count / currentPlan.limits.sav * 100} />}
                    </div>
                     <div>
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-sm">SMS Utilisés</span>
                         <span className={`text-sm font-medium ${getUsageColor(subscription.sms_credits_used, subscription.sms_credits_allocated)}`}>
                           {subscription.sms_credits_used}/{subscription.sms_credits_allocated}
                         </span>
                       </div>
                       <Progress value={subscription.sms_credits_used / subscription.sms_credits_allocated * 100} />
                       
                       {/* Bouton Acheter SMS */}
                       
                     </div>
                  </div>
                </CardContent>
              </Card>

               {/* Crédits SMS supplémentaires */}
               <Card className="border-blue-200 bg-blue-50">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2 text-blue-700">
                     <MessageSquare className="h-5 w-5" />
                     Crédits SMS Supplémentaires
                   </CardTitle>
                   <CardDescription className="text-blue-600">
                     Achetez des crédits SMS en plus de votre forfait mensuel
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-3">
                     <p className="text-sm text-blue-700">
                       Tarifs selon votre plan : {currentPlan.name}
                     </p>
                     <Button className="w-full" variant="default" onClick={() => window.location.href = '/settings?tab=sms'}>
                       <CreditCard className="h-4 w-4 mr-2" />
                       Acheter des SMS
                     </Button>
                   </div>
                 </CardContent>
               </Card>

               {/* Limits Warning */}
               {(subscription.active_sav_count / (currentPlan.limits.sav === 999999 ? 1000 : currentPlan.limits.sav) > 0.8 || subscription.sms_credits_used / subscription.sms_credits_allocated > 0.8) && <Card className="border-orange-200 bg-orange-50">
                   <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-orange-700">
                       <AlertTriangle className="h-5 w-5" />
                       Attention aux Limites
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <Alert>
                       <AlertTriangle className="h-4 w-4" />
                       <AlertDescription>
                         Vous approchez des limites de votre plan. Considérez une mise à niveau pour éviter les interruptions.
                       </AlertDescription>
                     </Alert>
                   </CardContent>
                 </Card>}
            </div>}

          {/* Plans */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Choisissez votre plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map(plan => {
              const PlanIcon = plan.icon;
              const isCurrent = isCurrentPlan(plan.id);
              const canUpgradeToThis = canUpgrade(plan.id);
              return <Card key={plan.id} className={`relative ${isCurrent ? 'border-primary bg-primary/5' : ''}`}>
                    {isCurrent && <Badge className="absolute -top-2 left-4 bg-primary">
                        Plan Actuel
                      </Badge>}
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PlanIcon className="h-5 w-5" />
                        {plan.name}
                      </CardTitle>
                      <CardDescription>
                        <span className="text-3xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Section des limites SAV et SMS */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Zap className="h-4 w-4 text-primary" />
                          SAV: {plan.limits.sav === 999999 ? 'Illimité' : `${plan.limits.sav} maximum`}
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          SMS: {plan.limits.sms} par mois
                        </div>
                      </div>
                      
                      <hr className="mb-6" />
                      
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, index) => <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{feature}</span>
                          </li>)}
                      </ul>
                      
                      {plan.id === 'free' || (plan.price === 'Gratuit') ? <Button variant="outline" disabled className="w-full">
                          Plan Gratuit
                        </Button> : isCurrent ? <Button variant="outline" disabled className="w-full">
                          Plan Actuel
                        </Button> : canUpgradeToThis ? 
                          plan.contact_only ? <Button 
                            onClick={() => window.location.href = `mailto:contact@fixway.fr?subject=Demande de contact pour le plan ${plan.name}&body=Bonjour,%0D%0A%0D%0AJe souhaite obtenir plus d'informations sur le plan ${plan.name}.%0D%0A%0D%0ACordialement`}
                            className="w-full"
                          >
                            Nous contacter
                          </Button> : <Button onClick={() => createCheckout(plan.id as 'premium' | 'enterprise')} className="w-full">
                            Passer à {plan.name}
                          </Button> : <Button variant="outline" disabled className="w-full">
                          Indisponible
                        </Button>}
                    </CardContent>
                  </Card>;
            })}
            </div>
          </div>

          {/* Billing Info */}
          {subscription?.subscription_end && <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Informations de Facturation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Votre abonnement se renouvelle le {new Date(subscription.subscription_end).toLocaleDateString('fr-FR')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Les crédits SMS se remettent à zéro chaque début de mois.
                </p>
              </CardContent>
            </Card>}
        </main>
      </div>
    </div>;
}