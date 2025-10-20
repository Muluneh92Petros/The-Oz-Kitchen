import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect authenticated users to price selection
  useEffect(() => {
    if (!loading && user) {
      navigate("/price");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#19464C] p-4 pb-8">
      {/* Status Bar Spacer for mobile */}
      <div className="h-11 w-full flex-shrink-0" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center gap-8 max-w-md w-full">
        {/* Scooter Image */}
        <div className="flex items-center justify-center p-2.5 rounded-full shadow-lg">
          <img 
            src="https://api.builder.io/api/v1/image/assets/TEMP/d02e1e5d3474921e5a87b4b602ff6ecbfb61f552?width=540" 
            alt="Delivery Scooter" 
            className="w-64 h-64 md:w-72 md:h-72 object-contain"
          />
        </div>

        {/* Text Content */}
        <div className="px-6 text-center">
          <p className="text-[#F3FAFB] text-base md:text-lg leading-relaxed">
            Ready-to-eat lunch boxes, delivered weekly.{" "}
            <span className="font-bold">Tasty, fresh, and affordable.</span>
          </p>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="w-full max-w-md flex flex-col items-center gap-3">
        {/* Get Started Button */}
        <button
          onClick={() => navigate("/signup")}
          className="w-full bg-[#E9AA44] hover:bg-[#E9AA44]/90 text-white font-bold text-base py-4 px-8 rounded-xl transition-all duration-200 active:scale-95"
        >
          Get Started
        </button>

        {/* Home Indicator */}
        <div className="w-32 h-1.5 bg-black rounded-full" />
      </div>
    </div>
  );
}
