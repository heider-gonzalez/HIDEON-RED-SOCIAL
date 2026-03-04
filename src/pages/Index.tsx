import React from "react";
import { Feed } from "@/components/feed/Feed";
import { FacebookLayout } from "@/components/layout/FacebookLayout";
import { SimpleOnboardingModal } from "@/components/onboarding/SimpleOnboardingModal";
import { useOnboarding } from "@/hooks/use-onboarding";
import { QuickPostBox } from "@/components/feed/QuickPostBox";
import { useAuth } from "@/providers/AuthProvider";

export default function Index() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { isAuthenticated } = useAuth();

  return (
    <FacebookLayout>
      <div className="w-full bg-background">
        {isAuthenticated && <QuickPostBox />}
        <Feed />
      </div>

      <SimpleOnboardingModal
        isOpen={showOnboarding}
        onClose={completeOnboarding}
      />
    </FacebookLayout>
  );
}