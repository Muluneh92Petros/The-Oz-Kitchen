import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShoppingBag, Plus, Edit, Trash2, X, Check, Search } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: boolean;
  allergens: string[];
}

export default function MenuItemsManager() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    is_available: true,
    allergens: '',
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meals')
        .select(`
          *,
          meal_categories (
            name
          )
        `)
        .order('name');

      if (error) throw error;
      
      // Transform meals to match MenuItem interface
      const transformedItems = (data || []).map(meal => ({
        id: meal.id,
        name: meal.name,
        description: meal.description || '',
        price: meal.base_price,
        category: meal.meal_categories?.name || 'Uncategorized',
        image_url: meal.image_url || '',
        is_available: meal.is_available,
        allergens: meal.dietary_tags || []
      }));
      
      setMenuItems(transformedItems);
    } catch (error) {
      console.error('Error loading menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image_url: '',
      is_available: true,
      allergens: '',
    });
    setEditingItem(null);
  };

  const openModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        category: item.category,
        image_url: item.image_url,
        is_available: item.is_available,
        allergens: item.allergens?.join(', ') || '',
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const allergensArray = formData.allergens
        ? formData.allergens.split(',').map(item => item.trim())
        : [];
      
      const itemData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        image_url: formData.image_url,
        is_available: formData.is_available,
        allergens: allergensArray,
      };

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('meals')
          .update({
            name: itemData.name,
            description: itemData.description,
            base_price: itemData.price,
            image_url: itemData.image_url,
            is_available: itemData.is_available,
            dietary_tags: itemData.allergens,
          })
          .eq('id', editingItem.id);

        if (error) throw error;

        setMenuItems(menuItems.map(item => 
          item.id === editingItem.id ? { ...item, ...itemData } : item
        ));
      } else {
        // Create new item
        const { data, error } = await supabase
          .from('meals')
          .insert([{
            name: itemData.name,
            description: itemData.description,
            base_price: itemData.price,
            image_url: itemData.image_url,
            is_available: itemData.is_available,
            dietary_tags: itemData.allergens,
            category_id: '550e8400-e29b-41d4-a716-446655440001' // Default category, should be dynamic
          }])
          .select();

        if (error) throw error;
        if (data) {
          setMenuItems([...menuItems, data[0]]);
        }
      }

      closeModal();
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Failed to save menu item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMenuItems(menuItems.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Failed to delete menu item');
    }
  };

  const toggleAvailability = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('meals')
        .update({ is_available: !currentValue })
        .eq('id', id);

      if (error) throw error;

      setMenuItems(menuItems.map(item => 
        item.id === id ? { ...item, is_available: !currentValue } : item
      ));
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update item availability');
    }
  };

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <ShoppingBag className="w-6 h-6 mr-2 text-[#f59e42]" />
          Menu Items
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent w-full sm:w-64"
            />
          </div>
          <button
            onClick={() => openModal()}
            className="bg-[#f59e42] text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-[#e68d31] transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No menu items found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white border rounded-xl overflow-hidden hover:shadow-md transition ${
                !item.is_available ? 'opacity-60' : ''
              }`}
            >
              <div className="h-48 overflow-hidden relative">
                <img
                  src={item.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Error+Loading+Image';
                  }}
                />
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button
                    onClick={() => toggleAvailability(item.id, item.is_available)}
                    className={`p-2 rounded-full ${
                      item.is_available
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-gray-500 hover:bg-gray-600'
                    } text-white`}
                    title={item.is_available ? 'Available' : 'Unavailable'}
                  >
                    {item.is_available ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                  <span className="font-bold text-[#f59e42]">${item.price.toFixed(2)}</span>
                </div>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {item.category}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for adding/editing menu items */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-xl font-semibold">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (ETB)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergens (comma separated)
                </label>
                <input
                  type="text"
                  name="allergens"
                  value={formData.allergens}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent"
                  placeholder="gluten, dairy, nuts"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_available"
                  name="is_available"
                  checked={formData.is_available}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
                  className="h-4 w-4 text-[#f59e42] focus:ring-[#f59e42] border-gray-300 rounded"
                />
                <label htmlFor="is_available" className="ml-2 block text-sm text-gray-700">
                  Available for ordering
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#f59e42] text-white rounded-lg hover:bg-[#e68d31]"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
