import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import LegalDocumentDialog from '@/components/legal/LegalDocumentDialog';
import { LandingCarousel } from '@/components/landing/LandingCarousel';
import { useLandingContent } from '@/hooks/useLandingContent';
import { HeroSection } from '@/components/landing/HeroSection';
import { ComparisonTable } from '@/components/landing/ComparisonTable';
import { FeaturePillars } from '@/components/landing/FeaturePillars';
import { AnimatedCounters } from '@/components/landing/AnimatedCounters';
import { IndustryBadges } from '@/components/landing/IndustryBadges';
import { TestimonialSection } from '@/components/landing/TestimonialSection';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { PricingSection } from '@/components/landing/PricingSection';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  billing_interval: 'month' | 'year';
  sav_limit: number | null;
  sms_limit: number;
  features: string[];
  is_active: boolean;
  contact_only: boolean;
}

export default function PublicLanding() {
  console.log('PublicLanding rendering - completely outside auth context');
  console.log('Current URL:', window.location.href);
  
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [legalDialog, setLegalDialog] = useState<{
    isOpen: boolean;
    type: 'cgu_content' | 'cgv_content' | 'privacy_policy';
    title: string;
  }>({
    isOpen: false,
    type: 'cgu_content',
    title: ''
  });
  const { content: landingContent } = useLandingContent();
  
  useEffect(() => {
    // Check if user is already authenticated and redirect
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('User is authenticated, redirecting to dashboard');
        window.location.href = '/dashboard';
      }
    };
    
    checkAuth();
    fetchSubscriptionPlans();
  }, []);

  const fetchSubscriptionPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price');

      if (error) throw error;
      
      // Transform data to match our interface
      const transformedPlans = (data || []).map(plan => ({
        ...plan,
        description: plan.description || '',
        billing_interval: plan.billing_interval as 'month' | 'year',
        features: Array.isArray(plan.features) ? plan.features.map(f => String(f)) : []
      }));
      
      setSubscriptionPlans(transformedPlans);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      setSubscriptionPlans([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAuthClick = () => {
    window.location.href = '/auth';
  };

  const handleLegalClick = (type: 'cgu_content' | 'cgv_content' | 'privacy_policy', title: string) => {
    setLegalDialog({ isOpen: true, type, title });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <LandingHeader onAuthClick={handleAuthClick} />

      {/* Hero Section */}
      <HeroSection onAuthClick={handleAuthClick} />

      {/* Carousel Section */}
      {(landingContent.show_carousel ?? true) && <LandingCarousel />}

      {/* Comparison Table - Before/After */}
      <ComparisonTable />

      {/* Feature Pillars - 5 pillars */}
      <FeaturePillars />

      {/* Animated Counters */}
      <AnimatedCounters />

      {/* Industry Badges */}
      <IndustryBadges />

      {/* Testimonials */}
      <TestimonialSection />

      {/* Pricing */}
      <PricingSection 
        plans={subscriptionPlans} 
        loading={loading} 
        onAuthClick={handleAuthClick} 
      />

      {/* Final CTA */}
      <FinalCTA onAuthClick={handleAuthClick} />

      {/* Footer */}
      <LandingFooter onLegalClick={handleLegalClick} />

      {/* Legal Document Dialog */}
      <LegalDocumentDialog
        type={legalDialog.type}
        title={legalDialog.title}
        isOpen={legalDialog.isOpen}
        onClose={() => setLegalDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
