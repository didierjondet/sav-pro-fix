import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Store, Users, Rocket, PartyPopper, Wrench, Package, UserPlus, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

interface ProfileSetupProps {
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'personal' | 'choice' | 'create-shop' | 'join-shop' | 'celebration';
type PathChoice = 'create' | 'join' | null;

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [pathChoice, setPathChoice] = useState<PathChoice>(null);
  const [animateIn, setAnimateIn] = useState(true);
  const [joinedShopName, setJoinedShopName] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    shopName: '',
    shopEmail: '',
    shopPhone: '',
    shopAddress: '',
    inviteCode: ''
  });

  const stepProgress: Record<OnboardingStep, number> = {
    'welcome': 0,
    'personal': 25,
    'choice': 50,
    'create-shop': 75,
    'join-shop': 75,
    'celebration': 100,
  };

  const goToStep = (next: OnboardingStep) => {
    setAnimateIn(false);
    setTimeout(() => {
      setStep(next);
      setAnimateIn(true);
    }, 200);
  };

  const handleCreateShop = async () => {
    if (!user || !formData.firstName || !formData.lastName || !formData.shopName) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .insert({
          name: formData.shopName,
          email: formData.shopEmail || user.email,
          phone: formData.shopPhone,
          address: formData.shopAddress,
        })
        .select()
        .single();
      if (shopError) throw shopError;

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          shop_id: shop.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          role: 'admin'
        });
      if (profileError) throw profileError;

      setPathChoice('create');
      goToStep('celebration');
    } catch (error: any) {
      console.error('Error creating shop and profile:', error);
      toast({ title: "Erreur", description: error.message || "Impossible de créer le magasin", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinShop = async () => {
    if (!user || !formData.firstName || !formData.lastName || !formData.inviteCode) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let shop;
      const { data: shopByCode } = await supabase
        .from('shops')
        .select('id, name')
        .ilike('invite_code', formData.inviteCode)
        .maybeSingle();

      if (shopByCode) {
        shop = shopByCode;
      } else {
        const { data: shopBySlug } = await supabase
          .from('shops')
          .select('id, name')
          .ilike('slug', formData.inviteCode)
          .maybeSingle();
        shop = shopBySlug;
      }

      if (!shop) throw new Error("Code d'invitation invalide");

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          shop_id: shop.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          role: 'technician'
        });
      if (profileError) throw profileError;

      setJoinedShopName(shop.name || 'votre équipe');
      setPathChoice('join');
      goToStep('celebration');
    } catch (error: any) {
      console.error('Error joining shop:', error);
      toast({ title: "Erreur", description: error.message || "Impossible de rejoindre le magasin", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const animClass = animateIn ? 'animate-fade-in opacity-100' : 'opacity-0 transition-opacity duration-200';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress bar */}
        {step !== 'welcome' && step !== 'celebration' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Configuration</span>
              <span>{stepProgress[step]}%</span>
            </div>
            <Progress value={stepProgress[step]} className="h-2" />
          </div>
        )}

        {/* Step: Welcome */}
        {step === 'welcome' && (
          <Card className={`border-none shadow-2xl ${animClass}`}>
            <CardContent className="pt-12 pb-10 text-center space-y-8">
              <div className="text-7xl animate-bounce">🎉</div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Bienvenue sur FixWay !
                </h1>
                <p className="text-muted-foreground text-lg">
                  Prêt à simplifier la gestion de votre SAV ?
                </p>
              </div>
              <Button size="lg" onClick={() => goToStep('personal')} className="gap-2 text-lg px-8 py-6 hover-scale">
                C'est parti ! <Rocket className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Personal info */}
        {step === 'personal' && (
          <Card className={`border-none shadow-2xl ${animClass}`}>
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center space-y-2">
                <Sparkles className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-2xl font-bold">Faisons connaissance</h2>
                <p className="text-muted-foreground">Quelques infos pour commencer</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Votre prénom" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Votre nom" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Votre numéro de téléphone" />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => goToStep('welcome')} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button
                  onClick={() => {
                    if (!formData.firstName || !formData.lastName) {
                      toast({ title: "Erreur", description: "Le prénom et le nom sont obligatoires", variant: "destructive" });
                      return;
                    }
                    goToStep('choice');
                  }}
                  className="gap-1"
                >
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Choice */}
        {step === 'choice' && (
          <div className={`space-y-6 ${animClass}`}>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Que souhaitez-vous faire ?</h2>
              <p className="text-muted-foreground">Choisissez votre aventure</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                className="cursor-pointer border-2 border-transparent hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover-scale group"
                onClick={() => goToStep('create-shop')}
              >
                <CardContent className="pt-8 pb-8 text-center space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Store className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Créer ma boutique</h3>
                    <p className="text-sm text-muted-foreground mt-1">Je lance mon activité SAV</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer border-2 border-transparent hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover-scale group"
                onClick={() => goToStep('join-shop')}
              >
                <CardContent className="pt-8 pb-8 text-center space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Rejoindre une boutique</h3>
                    <p className="text-sm text-muted-foreground mt-1">J'ai un code d'invitation</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <Button variant="ghost" onClick={() => goToStep('personal')} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Retour
              </Button>
            </div>
          </div>
        )}

        {/* Step: Create shop */}
        {step === 'create-shop' && (
          <Card className={`border-none shadow-2xl ${animClass}`}>
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center space-y-2">
                <Store className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-2xl font-bold">Créer votre boutique</h2>
                <p className="text-muted-foreground">Les informations de votre magasin</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Nom du magasin *</Label>
                  <Input id="shopName" value={formData.shopName} onChange={(e) => setFormData({ ...formData, shopName: e.target.value })} placeholder="Nom de votre magasin" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopEmail">Email du magasin</Label>
                  <Input id="shopEmail" type="email" value={formData.shopEmail} onChange={(e) => setFormData({ ...formData, shopEmail: e.target.value })} placeholder="contact@monmagasin.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopPhone">Téléphone du magasin</Label>
                  <Input id="shopPhone" value={formData.shopPhone} onChange={(e) => setFormData({ ...formData, shopPhone: e.target.value })} placeholder="01 23 45 67 89" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopAddress">Adresse du magasin</Label>
                  <Input id="shopAddress" value={formData.shopAddress} onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })} placeholder="123 Rue de la République, 75001 Paris" />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => goToStep('choice')} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={handleCreateShop} disabled={loading} className="gap-1">
                  {loading ? "Création..." : "Créer ma boutique"} <Rocket className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Join shop */}
        {step === 'join-shop' && (
          <Card className={`border-none shadow-2xl ${animClass}`}>
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center space-y-2">
                <Users className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-2xl font-bold">Rejoindre une boutique</h2>
                <p className="text-muted-foreground">Entrez le code fourni par votre responsable</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Code d'invitation *</Label>
                  <Input id="inviteCode" value={formData.inviteCode} onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })} placeholder="Code fourni par votre responsable" className="text-center text-lg tracking-widest" />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => goToStep('choice')} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={handleJoinShop} disabled={loading} className="gap-1">
                  {loading ? "Connexion..." : "Rejoindre"} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Celebration */}
        {step === 'celebration' && (
          <Card className={`border-none shadow-2xl overflow-hidden ${animClass}`}>
            <CardContent className="pt-10 pb-10 text-center space-y-8 relative">
              {/* Confetti / Firework particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className={pathChoice === 'create' ? 'animate-confetti' : 'animate-firework'}
                    style={{
                      position: 'absolute',
                      left: `${Math.random() * 100}%`,
                      top: pathChoice === 'create' ? `-${Math.random() * 20}%` : '100%',
                      width: pathChoice === 'create' ? '10px' : '6px',
                      height: pathChoice === 'create' ? '10px' : '6px',
                      borderRadius: pathChoice === 'create' ? '2px' : '50%',
                      backgroundColor: ['hsl(var(--primary))', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'][i % 6],
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1.5 + Math.random() * 2}s`,
                    }}
                  />
                ))}
              </div>

              {pathChoice === 'create' ? (
                <>
                  <div className="text-7xl animate-bounce">🚀</div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      Votre boutique est prête !
                    </h2>
                    <p className="text-muted-foreground text-lg">
                      Voici les prochaines étapes pour bien démarrer
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="space-y-2 p-4 rounded-xl bg-muted/50">
                      <Wrench className="h-8 w-8 text-primary mx-auto" />
                      <p className="text-sm font-medium">Configurer vos types SAV</p>
                    </div>
                    <div className="space-y-2 p-4 rounded-xl bg-muted/50">
                      <Package className="h-8 w-8 text-primary mx-auto" />
                      <p className="text-sm font-medium">Ajouter vos pièces</p>
                    </div>
                    <div className="space-y-2 p-4 rounded-xl bg-muted/50">
                      <UserPlus className="h-8 w-8 text-primary mx-auto" />
                      <p className="text-sm font-medium">Inviter votre équipe</p>
                    </div>
                  </div>

                  <Button size="lg" onClick={onComplete} className="gap-2 text-lg px-8 py-6 hover-scale">
                    Découvrir mon espace <PartyPopper className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-7xl animate-bounce">🎆</div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      Bienvenue dans l'équipe !
                    </h2>
                    <p className="text-muted-foreground text-lg">
                      Vous avez rejoint <span className="font-semibold text-foreground">{joinedShopName}</span>
                    </p>
                  </div>

                  <Button size="lg" onClick={onComplete} className="gap-2 text-lg px-8 py-6 hover-scale">
                    Entrer <ArrowRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
