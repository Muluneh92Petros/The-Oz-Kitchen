import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

interface MealCalendarProps {
  meal: {
    id: string;
    name: string;
    image: string;
    category?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToDate: (dates: Date[]) => void;
}

/**
 * Simple, interactive month calendar:
 * - Monday-first weeks
 * - 6x7 grid (always), shows previous/next month days muted
 * - Click (or Enter/Space) to toggle selection
 * - Keyboard accessible, highlights today
 * - Internal selection uses ISO date keys for robust comparisons
 */
export default function MealCalendar({
  meal,
  isOpen,
  onClose,
  onAddToDate,
}: MealCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  // store selected dates as ISO strings (YYYY-MM-DD) for easy comparison
  const [selectedIsoSet, setSelectedIsoSet] = useState<Record<string, true>>({});

  if (!isOpen || !meal) return null;

  const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const monthNames = useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    []
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper: format Date to ISO YYYY-MM-DD (local date)
  const toIsoDate = (d: Date) => d.toISOString().split("T")[0];

  // Build 6x7 grid starting from the Monday of the week that contains the 1st of month
  const grid = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const weekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - weekday); // go back to Monday

    const days = Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return {
        date: d,
        iso: toIsoDate(d),
        inMonth: d.getMonth() === month,
      };
    });
    return days;
  }, [year, month]);

  const monthYear = `${monthNames[month]} ${year}`;
  const todayIso = toIsoDate(new Date());

  const toggleIso = (iso: string) => {
    setSelectedIsoSet((prev) => {
      const next = { ...prev };
      if (next[iso]) {
        delete next[iso];
      } else {
        next[iso] = true;
      }
      return next;
    });
  };

  const handleAdd = () => {
    const isos = Object.keys(selectedIsoSet);
    if (isos.length === 0) return;
    // convert back to Date objects (at midnight UTC representation; this mirrors prior behavior)
    const dates = isos.map((iso) => new Date(iso + "T00:00:00.000Z"));
    onAddToDate(dates);
    setSelectedIsoSet({});
    onClose();
  };

  const goPrev = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add meal to calendar"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={meal.image}
                alt={meal.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">{meal.name}</h3>
              {meal.category && (
                <p className="text-xs text-foreground/70">{meal.category}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-md text-foreground hover:bg-gray-100"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Card */}
        <div className="bg-oz-gray-light rounded-md p-4 mb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-sm font-bold text-foreground">{monthYear}</div>
              <button
                onClick={goNext}
                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToday}
                className="text-xs bg-white px-2 py-1 rounded-md hover:bg-gray-100"
                aria-label="Go to current month"
                title="Go to today"
              >
                Today
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs text-foreground/50 font-normal">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map(({ date, iso, inMonth }) => {
              const isSelected = !!selectedIsoSet[iso];
              const isToday = iso === todayIso;
              return (
                <button
                  key={iso}
                  onClick={() => toggleIso(iso)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleIso(iso);
                    }
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${
                    inMonth ? "" : "Other month "
                  }${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`}
                  title={`${date.toDateString()}`}
                  className={`
                    aspect-square flex items-center justify-center text-sm rounded-full transition-all
                    ${inMonth ? "" : "opacity-40"}
                    ${isSelected ? "bg-primary text-white font-medium" : "hover:bg-gray-200"}
                    ${isToday ? "ring-2 ring-primary/40" : ""}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer / actions */}
        <div className="px-2 mb-2">
          <p className="text-sm text-foreground mb-1">
            Choose one or more dates to add <strong>{meal.name}</strong> to your meal plan.
          </p>
          <p className="text-sm text-oz-gray-placeholder">
            {Object.keys(selectedIsoSet).length} selected
          </p>
        </div>

        <div className="flex justify-end px-2">
          <button
            onClick={handleAdd}
            disabled={Object.keys(selectedIsoSet).length === 0}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Add</span>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

