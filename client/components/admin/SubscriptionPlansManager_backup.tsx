import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Search, Filter, Calendar, MapPin, Clock, User } from 'lucide-react';

interface Order {
  id: string;
  customer_id: string;
  delivery_date: string;
  delivery_time: string;
  delivery_address: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  customers?: {
    first_name: string;
    last_name: string | null;
    phone: string | null;
  };
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-purple-100 text-purple-800 border-purple-200',
  out_for_delivery: 'bg-orange-100 text-orange-800 border-orange-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      // Use meal_plans as orders since that's our order system
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform meal_plans to match Order interface
      const transformedOrders = (data || []).map(plan => ({
        id: plan.id,
        customer_id: plan.user_id,
        delivery_date: plan.created_at, // Use creation date as delivery date for now
        delivery_time: '12:00-14:00', // Default time slot
        delivery_address: 'No address provided', // Default address
        status: plan.status || 'pending',
        total_amount: plan.total_amount || 0,
        notes: null,
        created_at: plan.created_at,
        customers: {
          first_name: plan.profiles?.full_name?.split(' ')[0] || 'Unknown',
          last_name: plan.profiles?.full_name?.split(' ').slice(1).join(' ') || null,
          phone: null
        }
      }));
      
      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const { error } = await supabase
        .from('meal_plans')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    } finally {
      setUpdating(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Handle case where customers might be undefined
    const customerFirstName = order.customers?.first_name || '';
    const customerLastName = order.customers?.last_name || '';
    
    const matchesSearch =
      customerFirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerLastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.delivery_address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
          <Package className="w-6 h-6 mr-2 text-[#f59e42]" />
          Order Management
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent w-full sm:w-64"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent appearance-none w-full sm:w-auto"
            >
              <option value="all">All Status</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No orders found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="font-semibold text-gray-900">
                        {order.customers?.first_name || 'Unknown'} {order.customers?.last_name || ''}
                      </span>
                      {order.customers?.phone && (
                        <span className="text-sm text-gray-500">
                          {order.customers.phone}
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100'
                      }`}
                    >
                      {statusOptions.find(s => s.value === order.status)?.label || order.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(order.delivery_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {order.delivery_time || 'Not specified'}
                    </div>
                    <div className="flex items-start text-gray-600 sm:col-span-2">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{order.delivery_address || 'No address provided'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-lg font-bold text-gray-900">
                      ${order.total_amount?.toFixed(2) || '0.00'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Ordered: {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {order.notes && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                      <span className="font-medium">Note:</span> {order.notes}
                    </div>
                  )}
                </div>

                <div className="lg:ml-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Status
                  </label>
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    disabled={updating === order.id}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
