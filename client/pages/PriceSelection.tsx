import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionPlans, useCreateSubscription, useCurrentSubscription } from "@/hooks/useSubscriptions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function PriceSelection() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [subscriptionType, setSubscriptionType] = useState<"monthly" | "weekly">("weekly");
  const [budgetLimit, setBudgetLimit] = useState("");
  
  // Fetch subscription plans from database
  const { data: subscriptionPlans, isLoading: plansLoading } = useSubscriptionPlans();
  const { mutate: createSubscription, isPending: isCreating } = useCreateSubscription();
  
  // Check for existing active subscription
  const { data: currentSubscription, isLoading: subscriptionLoading } = useCurrentSubscription();

  // Redirect to meals if user already has an active subscription
  useEffect(() => {
    if (currentSubscription && !subscriptionLoading) {
      console.log("User already has active subscription:", currentSubscription);
      
      // Get the plan details for the existing subscription
      const existingPlan = subscriptionPlans?.find(plan => plan.id === currentSubscription.plan_id);
      
      if (existingPlan) {
        navigate("/meals", { 
          state: { 
            subscriptionType: existingPlan.duration_days === 7 ? "weekly" : "monthly",
            budgetLimit: currentSubscription.budget_limit?.toString() || "1000",
            planId: existingPlan.id,
            planName: existingPlan.name
          } 
        });
      }
    }
  }, [currentSubscription, subscriptionLoading, subscriptionPlans, navigate]);

  // Get the selected plan based on subscription type
  const selectedPlan = subscriptionPlans?.find(plan => 
    subscriptionType === "weekly" ? plan.duration_days === 7 : plan.duration_days === 30
  );

  const handleNext = () => {
    if (budgetLimit && selectedPlan && user) {
      // Create subscription with budget limit
      createSubscription({
        planId: selectedPlan.id,
        budgetLimit: parseFloat(budgetLimit)
      }, {
        onSuccess: () => {
          navigate("/meals", { 
            state: { 
              subscriptionType, 
              budgetLimit, 
              planId: selectedPlan.id,
              planName: selectedPlan.name
            } 
          });
        },
        onError: (error) => {
          console.error("Failed to create subscription:", error);
          // Handle error - could show toast notification
        }
      });
    }
  };

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {subscriptionLoading ? "Checking subscription..." : "Loading plans..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-secondary flex items-center px-4 py-3 md:px-8 md:py-4">
        <div className="flex items-center gap-3 flex-1">
          <img 
            src="https://api.builder.io/api/v1/image/assets/TEMP/ca87422a8faf30fea1aaea80c57344f579cee4ef?width=258" 
            alt="OZ Kitchen" 
            className="w-20 h-20 md:w-24 md:h-24 object-contain"
          />
          <h1 className="text-oz-gray-light text-sm md:text-base lg:text-lg font-semibold leading-tight">
            Fresh, Affordable Lunchboxes<br />Delivered to You
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 md:px-8 md:py-12 max-w-5xl mx-auto w-full">
        <div className="w-full max-w-md bg-card rounded-2xl p-6 md:p-8 space-y-6">
          {/* Segmented Control */}
          <div className="relative bg-white border border-oz-gray-border rounded-full p-0.5 flex">
            <button
              onClick={() => setSubscriptionType("monthly")}
              className={`flex-1 py-3 px-8 rounded-full text-base font-semibold transition-all duration-200 ${
                subscriptionType === "monthly"
                  ? "bg-primary text-white"
                  : "text-oz-gray-text"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSubscriptionType("weekly")}
              className={`flex-1 py-3 px-8 rounded-full text-base font-semibold transition-all duration-200 ${
                subscriptionType === "weekly"
                  ? "bg-primary text-white"
                  : "text-oz-gray-text"
              }`}
            >
              Weekly
            </button>
          </div>

          {/* Plan Description */}
          {selectedPlan && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">{selectedPlan.name}</h3>
              <p className="text-foreground text-base leading-relaxed">
                Get {selectedPlan.meals_per_week} fresh lunchboxes every {subscriptionType === "weekly" ? "week" : "month"}. 
                Perfect for busy weekdays, starting from {selectedPlan.base_price}ETB per {subscriptionType === "weekly" ? "week" : "month"}. 
                Delivered daily, fresh and warm.
              </p>
              {selectedPlan.features && (
                <div className="text-sm text-muted-foreground">
                  Features: {Object.entries(selectedPlan.features as Record<string, boolean>)
                    .filter(([_, enabled]) => enabled)
                    .map(([feature, _]) => feature.replace(/_/g, ' '))
                    .join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Budget Input */}
          <div className="space-y-3">
            <label htmlFor="budget" className="block text-base font-medium text-foreground">
              Enter your weekly budget (ETB)
            </label>
            <input
              id="budget"
              type="number"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              placeholder={selectedPlan ? `Min: ${selectedPlan.base_price}` : "Eg. 1000"}
              min={selectedPlan?.base_price || 799}
              className="w-full px-4 py-3.5 border border-oz-gray-border rounded-lg bg-card text-foreground placeholder:text-oz-gray-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Next Button */}
          <Button
            onClick={handleNext}
            disabled={!budgetLimit || !selectedPlan || isCreating}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-base py-4 rounded-full transition-all duration-200 active:scale-95"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Plan...
              </>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </main>

      {/* Bottom Navigation Dots */}
      <div className="py-6 flex flex-col items-center gap-3">
        <div className="flex gap-5">
          <div className="w-3 h-3 rounded-full bg-accent"></div>
          <div className="w-3 h-3 rounded-full bg-oz-gray-border"></div>
          <div className="w-3 h-3 rounded-full bg-oz-gray-border"></div>
          <div className="w-3 h-3 rounded-full bg-oz-gray-border"></div>
        </div>
        <div className="w-32 h-1 bg-black rounded-full"></div>
      </div>
    </div>
  );
}
