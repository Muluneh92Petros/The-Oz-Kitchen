import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";

type PaymentMethod = "telebirr" | "chapa" | null;

interface ReceiptMeal {
  id: string;
  name: string;
  quantity: number;
  price: number;
  dateISO?: string;
}

interface LocationState {
  subscriptionType?: "monthly" | "weekly";
  budgetLimit?: string;
  planId?: string;
  planName?: string;
  mealPlanId?: string;
  mealSchedule?: Record<string, Record<string, number>>;
  totalCost?: number;
  totalMeals?: number;
  meals?: ReceiptMeal[];
  totalPrice?: number;
  availableMeals?: any[]; // Meal data from database
}

const fallbackMeals: ReceiptMeal[] = [
  { id: "1-2025-10-05", name: "Shiro Ena Gomen", quantity: 1, price: 170, dateISO: "2025-10-05" },
  { id: "2-2025-10-06", name: "Misir Ena Shiro", quantity: 1, price: 170, dateISO: "2025-10-06" },
  { id: "3-2025-10-07", name: "Dinech Ena Gomen", quantity: 1, price: 170, dateISO: "2025-10-07" },
  { id: "4-2025-10-08", name: "Tibs", quantity: 1, price: 170, dateISO: "2025-10-08" },
  { id: "3-2025-10-09", name: "Dinech Ena Gomen", quantity: 1, price: 170, dateISO: "2025-10-09" },
];

export default function Receipt() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("telebirr");

  // Debug: Log the received state
  console.log("Receipt received state:", state);

  const subscriptionType = state.subscriptionType || "weekly";
  
  // Convert mealSchedule to meals format
  const convertScheduleToMeals = (
    mealSchedule: Record<string, Record<string, number>>, 
    availableMeals: any[] = []
  ): ReceiptMeal[] => {
    const mealsArray: ReceiptMeal[] = [];
    
    Object.entries(mealSchedule).forEach(([date, dayMeals]) => {
      Object.entries(dayMeals).forEach(([mealId, quantity]) => {
        // Find the actual meal data from the available meals
        const mealData = availableMeals.find(meal => meal.id === mealId);
        
        const mealName = mealData?.name || `Meal ${mealId}`;
        const mealPrice = mealData?.base_price || 170;
        
        mealsArray.push({
          id: `${mealId}-${date}`,
          name: mealName,
          quantity,
          price: mealPrice,
          dateISO: date
        });
      });
    });
    
    return mealsArray;
  };

  const meals = state.mealSchedule 
    ? convertScheduleToMeals(state.mealSchedule, state.availableMeals)
    : (state.meals && state.meals.length > 0 ? state.meals : fallbackMeals);

  const selectedMeals = useMemo(
    () => meals.filter((meal) => meal.quantity > 0),
    [meals]
  );

  const calculatedTotalPrice = useMemo(
    () => selectedMeals.reduce((sum, meal) => sum + meal.quantity * meal.price, 0),
    [selectedMeals]
  );

  // Use the total cost from meal selection if available, otherwise calculate
  const totalPrice = state.totalCost || state.totalPrice || calculatedTotalPrice;

  const handleNext = () => {
    if (selectedPayment) {
      console.log("Payment selected:", {
        selectedPayment,
        totalPrice,
        meals: selectedMeals,
      });
    }
  };

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
            Choose Your Packaging Style
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 py-4 md:px-8 md:py-6 gap-4">
        {/* Receipt Section */}
        <div className="bg-white rounded-3xl p-6">
          <h2 className="text-2xl font-medium text-foreground mb-2">Receipt</h2>
          <p className="text-base text-foreground mb-4">Choose your weekly package</p>

          <div className="py-4 space-y-4">
            {/* Package Type */}
            <div className="space-y-0.5">
              <p className="text-xs text-foreground">Package</p>
              <p className="text-base font-medium text-foreground capitalize">{subscriptionType}</p>
            </div>

            {/* Meals List */}
            <div className="space-y-0.5">
              <p className="text-xs text-foreground">Meal</p>
              <div className="space-y-1">
                {selectedMeals.map((meal) => {
                  const dateLabel = meal.dateISO
                    ? format(parseISO(meal.dateISO), "EEEE MMM d")
                    : undefined;

                  return (
                    <div key={meal.id} className="text-base font-medium text-foreground leading-tight">
                      <span>{meal.name}</span>
                      {dateLabel && (
                        <span className="ml-1 text-sm font-normal text-foreground/70">{dateLabel}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sub Total */}
            <div className="space-y-0.5">
              <p className="text-xs text-foreground">Sub Total</p>
              <p className="text-base font-semibold text-foreground">{totalPrice} ETB</p>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="bg-white rounded-3xl p-6 pb-3">
          <h2 className="text-2xl font-medium text-foreground mb-2">Payment</h2>
          <p className="text-base text-foreground mb-3">Choose your payment option</p>

          <div className="flex items-center gap-6 py-3">
            {/* Telebirr */}
            <button
              onClick={() => setSelectedPayment("telebirr")}
              className={`w-28 h-28 rounded-3xl border-2 transition-all duration-200 flex items-center justify-center p-4 ${
                selectedPayment === "telebirr"
                  ? "border-primary bg-white"
                  : "border-oz-gray-border bg-white"
              }`}
            >
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/c766ff179da3322bb96e8f539722bafed505225e?width=158"
                alt="Telebirr"
                className="w-full h-auto object-contain"
              />
            </button>

            {/* Chapa */}
            <button
              onClick={() => setSelectedPayment("chapa")}
              className={`w-28 h-28 rounded-3xl border-2 transition-all duration-200 flex items-center justify-center p-4 ${
                selectedPayment === "chapa"
                  ? "border-primary bg-white"
                  : "border-oz-gray-border bg-white"
              }`}
            >
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/7102a25d757cbd076c92ab63c71269e2850f99d9?width=140"
                alt="Chapa"
                className="w-full h-auto object-contain"
              />
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Bar */}
      <div className="py-4 px-4 md:px-8 flex flex-col gap-3">
        <button
          onClick={handleNext}
          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-base py-3 rounded-full transition-all duration-200 active:scale-95"
        >
          Next
        </button>

        {/* Navigation Dots */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-5">
            <div className="w-3 h-3 rounded-full bg-oz-gray-border"></div>
            <div className="w-3 h-3 rounded-full bg-oz-gray-border"></div>
            <div className="w-3 h-3 rounded-full bg-accent"></div>
            <div className="w-3 h-3 rounded-full bg-oz-gray-border"></div>
          </div>
          <div className="w-32 h-1 bg-black rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
