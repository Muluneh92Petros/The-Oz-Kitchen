import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Plus, Edit } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  duration_days: number;
  meals_per_week: number;
  base_price: number;
  discount_percentage: number;
  is_active: boolean;
  features: any;
  created_at: string;
}

export default function SubscriptionPlansManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      console.log('Loading subscription plans...');
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('name');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Loaded plans:', data);
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading subscription plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
    setUpdating(planId);
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !currentStatus })
        .eq('id', planId);

      if (error) throw error;

      setPlans(plans.map(plan => 
        plan.id === planId ? { ...plan, is_active: !currentStatus } : plan
      ));
    } catch (error) {
      console.error('Error updating plan status:', error);
      alert('Failed to update plan status');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f59e42]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <CreditCard className="w-6 h-6 mr-2 text-[#f59e42]" />
          Subscription Plans
        </h2>
        <button className="bg-[#f59e42] text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-[#e68d31] transition">
          <Plus className="w-5 h-5 mr-2" />
          Add Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No subscription plans found</p>
          <p className="text-gray-400 text-sm">Debug: Found {plans.length} plans in database</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm bg-white rounded-lg border">
            <thead>
              <tr className="text-left text-gray-600 border-b bg-gray-50">
                <th className="px-4 py-3">Plan Name</th>
                <th className="px-4 py-3">Duration (Days)</th>
                <th className="px-4 py-3">Meals/Week</th>
                <th className="px-4 py-3">Base Price (ETB)</th>
                <th className="px-4 py-3">Discount (%)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{plan.name}</td>
                  <td className="px-4 py-3">{plan.duration_days}</td>
                  <td className="px-4 py-3">{plan.meals_per_week}</td>
                  <td className="px-4 py-3">{plan.base_price} ETB</td>
                  <td className="px-4 py-3">{plan.discount_percentage}%</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      plan.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => togglePlanStatus(plan.id, plan.is_active)}
                        disabled={updating === plan.id}
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          plan.is_active 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } disabled:opacity-50`}
                      >
                        {updating === plan.id ? 'Updating...' : (plan.is_active ? 'Deactivate' : 'Activate')}
                      </button>
                      <button className="text-blue-600 hover:text-blue-800">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}