import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import SignUpSimple from "./pages/SignUpSimple";
import SignIn from "./pages/SignIn";
import PriceSelection from "./pages/PriceSelection";
import MealSelection from "./pages/MealSelection";
import Packaging from "./pages/Packaging";
import Receipt from "./pages/Receipt";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route 
              path="/price" 
              element={
                <ProtectedRoute>
                  <PriceSelection />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/meals" 
              element={
                <ProtectedRoute>
                  <MealSelection />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/packaging" 
              element={
                <ProtectedRoute>
                  <Packaging />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/receipt" 
              element={
                <ProtectedRoute>
                  <Receipt />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
