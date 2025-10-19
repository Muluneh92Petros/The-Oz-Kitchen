import React, { useState } from "react";
import { LogOut, Package, ShoppingBag, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import OrdersManager from "../components/admin/OrdersManager";
import MenuItemsManager from "../components/admin/MenuItemsManager";
import SubscriptionPlansManager from "../components/admin/SubscriptionPlansManager";

/**
 * OZ Kitchen — Admin Dashboard
 * ------------------------------------------------------
 * • Real backend integration with Supabase
 * • Orders, Menu Items, Subscription Plans management
 * • Admin authentication and role-based access
 * • Uses copied Figma-designed components
 */

// ---------- Top Navigation ----------
function TopNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#f59e42]">OZ Kitchen Admin</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Admin Component ----------
export default function Admin() {
  const [activeTab, setActiveTab] = useState<"orders"|"menu"|"plans">("orders");
  
  const tabs = [
    { id: "orders" as const, label: "Orders", icon: Package },
    { id: "menu" as const, label: "Menu Items", icon: ShoppingBag },
    { id: "plans" as const, label: "Subscription Plans", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap gap-1 p-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition ${
                    activeTab === id ? "bg-[#f59e42] text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "orders" && <OrdersManager />}
            {activeTab === "menu" && <MenuItemsManager />}
            {activeTab === "plans" && <SubscriptionPlansManager />}
          </div>
        </div>
      </div>
    </div>
  );
}