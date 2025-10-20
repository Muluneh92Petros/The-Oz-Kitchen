import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAvailableMeals, useMealCategories } from "@/hooks/useMeals";
import { useCreateMealPlan, useAddMealToPlan } from "@/hooks/useMealPlans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Minus, ShoppingCart, Calendar, Clock } from "lucide-react";

interface LocationState {
  subscriptionType: "weekly" | "monthly";
  budgetLimit: string;
  planId: string;
  planName: string;
}

export default function MealSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const state = location.state as LocationState;

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedMeals, setSelectedMeals] = useState<Record<string, number>>({});
  const [mealSchedule, setMealSchedule] = useState<Record<string, Record<string, number>>>({});
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => {
    const today = new Date();
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    return monday.toISOString().split('T')[0];
  });

  // Helper function to get working days (Monday to Friday)
  const getWorkingDays = (startDate: string, days: number = 5) => {
    const workingDays = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      // Only include Monday to Friday (1-5)
      if (date.getDay() >= 1 && date.getDay() <= 5) {
        workingDays.push({
          date: date.toISOString().split('T')[0],
          dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
          dayShort: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: date.getDate(),
          month: date.toLocaleDateString('en-US', { month: 'short' })
        });
      }
    }
    return workingDays;
  };

  const workingDays = getWorkingDays(currentWeekStart, 7);

  // Fetch data from database
  const { data: categories, isLoading: categoriesLoading } = useMealCategories();
  const { data: meals, isLoading: mealsLoading } = useAvailableMeals(selectedCategory);
  const { mutate: createMealPlan, isPending: creatingPlan } = useCreateMealPlan();
  const { mutate: addMealToPlan, isPending: addingMeal } = useAddMealToPlan();

  // Redirect if no state
  useEffect(() => {
    if (!state || !user) {
      navigate("/price");
    }
  }, [state, user, navigate]);

  // Calculate totals from schedule
  const totalMeals = Object.values(mealSchedule).reduce((sum, dayMeals) => {
    return sum + Object.values(dayMeals).reduce((daySum, qty) => daySum + qty, 0);
  }, 0);
  
  const totalCost = Object.values(mealSchedule).reduce((sum, dayMeals) => {
    return sum + Object.entries(dayMeals).reduce((daySum, [mealId, qty]) => {
      const meal = meals?.find(m => m.id === mealId);
      return daySum + (meal ? meal.base_price * qty : 0);
    }, 0);
  }, 0);

  // Add meal to specific day
  const addMealToDay = (mealId: string, date: string) => {
    setMealSchedule(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [mealId]: (prev[date]?.[mealId] || 0) + 1
      }
    }));
  };

  // Remove meal from specific day
  const removeMealFromDay = (mealId: string, date: string) => {
    setMealSchedule(prev => {
      const dayMeals = { ...prev[date] };
      const currentQty = dayMeals[mealId] || 0;
      
      if (currentQty <= 1) {
        delete dayMeals[mealId];
      } else {
        dayMeals[mealId] = currentQty - 1;
      }
      
      return {
        ...prev,
        [date]: dayMeals
      };
    });
  };

  // Get meal quantity for specific day
  const getMealQuantityForDay = (mealId: string, date: string) => {
    return mealSchedule[date]?.[mealId] || 0;
  };

  const handleCreateMealPlan = () => {
    if (!state || totalMeals === 0) return;

    // For now, let's bypass the database operations and go directly to receipt
    // TODO: Implement proper meal plan creation once database is fully configured
    console.log("Creating meal plan with:", {
      weekStartDate: currentWeekStart,
      subscriptionId: state.planId,
      mealSchedule,
      totalCost,
      totalMeals
    });

    // Simulate a brief loading time then navigate
    setTimeout(() => {
      navigate("/receipt", {
        state: {
          ...state,
          mealPlanId: "temp-meal-plan-" + Date.now(),
          mealSchedule,
          totalCost,
          totalMeals,
          availableMeals: meals // Pass the meal data for name lookup
        }
      });
    }, 1000);
  };

  if (!state) {
    return null;
  }

  if (categoriesLoading || mealsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
          <div>
            <h1 className="text-oz-gray-light text-sm md:text-base lg:text-lg font-semibold leading-tight">
              Select Your Meals
            </h1>
            <p className="text-xs text-muted-foreground">
              {state.planName} • Budget: {state.budgetLimit} ETB
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 md:px-8 max-w-6xl mx-auto w-full">
        {/* Categories */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Categories</h2>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === undefined ? "default" : "outline"}
              onClick={() => setSelectedCategory(undefined)}
              size="sm"
            >
              All
            </Button>
            {categories?.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                size="sm"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Schedule (Working Days Only)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {workingDays.map((day) => (
              <Card key={day.date} className="p-3">
                <div className="text-center mb-2">
                  <div className="font-semibold text-sm">{day.dayShort}</div>
                  <div className="text-xs text-muted-foreground">{day.month} {day.dayNumber}</div>
                </div>
                <div className="space-y-1">
                  {Object.entries(mealSchedule[day.date] || {}).map(([mealId, quantity]) => {
                    const meal = meals?.find(m => m.id === mealId);
                    return meal ? (
                      <div key={mealId} className="text-xs bg-muted p-1 rounded flex justify-between items-center">
                        <span className="truncate">{meal.name}</span>
                        <span className="font-medium">×{quantity}</span>
                      </div>
                    ) : null;
                  })}
                  {Object.keys(mealSchedule[day.date] || {}).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No meals scheduled
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Meals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {meals?.map((meal) => (
            <Card key={meal.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {meal.image_url ? (
                  <img 
                    src={meal.image_url} 
                    alt={meal.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No Image
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{meal.name}</CardTitle>
                <CardDescription className="text-sm line-clamp-2">
                  {meal.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-lg">{meal.base_price} ETB</span>
                  <span className="text-sm text-muted-foreground">{meal.category_name}</span>
                </div>
                
                {/* Dietary Tags */}
                {meal.dietary_tags && meal.dietary_tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {meal.dietary_tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Schedule Controls */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Add to day:</div>
                  <div className="grid grid-cols-5 gap-1">
                    {workingDays.map((day) => {
                      const quantity = getMealQuantityForDay(meal.id, day.date);
                      return (
                        <div key={day.date} className="text-center">
                          <div className="text-xs mb-1">{day.dayShort}</div>
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-full text-xs p-0"
                              onClick={() => addMealToDay(meal.id, day.date)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            {quantity > 0 && (
                              <>
                                <span className="text-xs font-medium">{quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-full text-xs p-0"
                                  onClick={() => removeMealFromDay(meal.id, day.date)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary Card */}
        {totalMeals > 0 && (
          <Card className="sticky bottom-4 bg-card/95 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">
                    {totalMeals} meals selected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total: {totalCost} ETB
                  </p>
                </div>
                <Button 
                  onClick={handleCreateMealPlan}
                  disabled={totalMeals === 0}
                  className="gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Continue to Checkout
                </Button>
              </div>
              
              {totalCost > parseFloat(state.budgetLimit) && (
                <p className="text-sm text-destructive">
                  ⚠️ Total exceeds your budget of {state.budgetLimit} ETB
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
