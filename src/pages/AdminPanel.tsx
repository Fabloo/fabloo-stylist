import React, { useState, useEffect } from 'react';
import { Package, RefreshCcw, Search, CheckCircle, XCircle, Filter, Upload, Download, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';

type Order = {
  id: string;
  created_at: string;
  order_status: string;
  total_amount: number;
  tracking_number?: string;
  shipping_carrier?: string;
  shipping_address: {
    fullName: string;
    email: string;
  };
  user_id: string;
  items?: {
    id: string;
    quantity: number;
    price: number;
    inventory_item: {
      id: string;
      name: string;
      image_url: string;
    };
  }[];
};

type Return = {
  id: string;
  order_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  order: {
    total_amount: number;
    shipping_address: {
      fullName: string;
      email: string;
    };
  };
};

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  price: string;  // Changed to string since we're handling conversion
  stock: string;  // Changed to string since we're handling conversion
  image_url: string;
  image_url_2?: string;
  image_url_3?: string;
  brand_name?: string;
  sizes: string;  // Changed to string since we're storing as JSON string
  body_shapes: string;  // Changed to string since we're storing as JSON string
  color_tones: string;  // Changed to string since we're storing as JSON string
  dress_type: string;  // Changed to string since we're storing as JSON string
}

interface DressAttributes {
  fabric: string | string[];
  length: string;
  primary_colour: string | string[];
  primary_shades: string[];
  pattern: string | string[];
  neck: string | string[];
  occasion: string | string[];
  print: string | string[];
  shape: string | string[];
  sleeve_length: string;
  sleeve_styling: string;
}

interface CSVInventoryItem {
  [key: string]: any;  // Add index signature
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  image_url?: string;
  image_url_2?: string;
  image_url_3?: string;
  brand_name?: string;
  sizes?: string[];
  body_shapes?: string[];
  color_tones?: string[];
  dress_type?: string[];
  dress_attributes?: string;  // JSON string
}

interface DBInventoryItem {
  id?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  image_url_2: string | null;
  image_url_3: string | null;
  brand_name: string | null;
  sizes: string[];
  body_shapes: string[];
  color_tones: string[];
  dress_type: string[];
  dress_attributes?: DressAttributes;
}

export function AdminPanel() {
  const { isAdmin, user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'returns' | 'inventory'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showUploadGuide, setShowUploadGuide] = useState(false);
  const [uploadFormat, setUploadFormat] = useState<any>(null);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  console.log("user", user);
  console.log("isAdmin", isAdmin);

  useEffect(() => {
    fetchUploadFormat();
  }, []);

  const fetchUploadFormat = async () => {
    try {
      const { data, error } = await supabase
        .from('valid_inventory_format')
        .select('*');

      if (error) throw error;
      setUploadFormat(data);
    } catch (err) {
      console.error('Error fetching upload format:', err);
    }
  };

  useEffect(() => {
    const checkAuthentication = async () => {
      await useAuthStore.getState().checkAuth();
      setAuthChecking(false);
    };
    
    checkAuthentication();
  }, []);
  

  useEffect(() => {
    if (!authChecking && (!user || user?.user_metadata?.role !== 'admin')) {
      console.log("not admin");
      console.log(user);
      console.log(user?.role);
      console.log(authChecking);
    }
  }, [user, authChecking, navigate]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'returns') {
      fetchReturns();
    } else {
      fetchInventory();
    }
  }, [activeTab]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          item_attributes (
            body_shapes,
            color_tones,
            dress_type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleInventorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;

    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result;
        if (typeof text !== 'string') return;

        const rows = text.split('\n').filter(row => row.trim());
        const headers = rows[0].split(',').map(h => h.trim());
        const items: CSVInventoryItem[] = [];

        for (let i = 1; i < rows.length; i++) {
          const values = rows[i].split(',').map(v => v.trim());
          const item: CSVInventoryItem = {};

          headers.forEach((headerOrNull: string | null, index: number) => {
            const header = headerOrNull || '';
            const rawValue = values[index];
            
            // Skip empty values for optional fields
            if ((!rawValue || rawValue === '') && !requiredFields.includes(header)) {
              return;
            }

            // Ensure we have a string to work with
            const stringValue = String(rawValue || '').trim();
            let value: any = stringValue;

            // Handle arrays
            if (['body_shapes', 'sizes', 'color_tones', 'dress_type'].includes(header)) {
              value = stringValue ? stringValue.split(';').filter(Boolean).map(val => val.trim()) : [];
            }
            
            // Handle dress attributes
            if (header === 'dress_attributes') {
              try {
                if (!stringValue) {
                  throw new Error('Dress attributes cannot be empty');
                }
                
                // Parse the JSON string and validate the structure
                const parsedAttrs = JSON.parse(stringValue.replace(/\n/g, '')) as Partial<DressAttributes>;
                const requiredAttrs = [
                  'fabric', 'length', 'primary_colour', 'primary_shades',
                  'pattern', 'neck', 'occasion', 'print', 'shape',
                  'sleeve_length', 'sleeve_styling'
                ];
                
                // Validate all required fields are present
                const missingAttrs = requiredAttrs.filter(attr => !(attr in parsedAttrs));
                if (missingAttrs.length > 0) {
                  throw new Error(`Missing dress attributes: ${missingAttrs.join(', ')}`);
                }

                // Convert single values to arrays where needed
                const arrayFields = ['fabric', 'primary_colour', 'pattern', 'neck', 'occasion', 'print', 'shape'];
                arrayFields.forEach(field => {
                  const value = parsedAttrs[field as keyof DressAttributes];
                  if (value && !Array.isArray(value)) {
                    (parsedAttrs[field as keyof DressAttributes] as any) = [value];
                  }
                });
                
                // Ensure primary_shades is always an array
                if (!Array.isArray(parsedAttrs.primary_shades)) {
                  parsedAttrs.primary_shades = parsedAttrs.primary_shades ? [parsedAttrs.primary_shades as string] : [];
                }
                
                // Validate string fields
                if (typeof parsedAttrs.length !== 'string') {
                  throw new Error('Length must be a string');
                }
                if (typeof parsedAttrs.sleeve_length !== 'string') {
                  throw new Error('Sleeve length must be a string');
                }
                if (typeof parsedAttrs.sleeve_styling !== 'string') {
                  throw new Error('Sleeve styling must be a string');
                }

                value = parsedAttrs as DressAttributes;
              } catch (error) {
                const err = error as Error;
                throw new Error(`Invalid dress attributes JSON at row ${i + 1}: ${err.message}`);
              }
            }

            // Convert numeric values
            if (header === 'price' || header === 'stock') {
              const num = Number(value);
              if (isNaN(num)) {
                throw new Error(`Invalid number in ${header} at row ${i + 1}`);
              }
              value = num;
            }

            if (header) {
              item[header] = value;
            }
          });

          items.push(item);
        }

        // Process items
        for (const item of items) {
          if (!item.name || !item.price || !item.stock) {
            throw new Error('Missing required fields: name, price, stock');
          }

          // Check if item with same name exists
          const { data: existingItems, error: searchError } = await supabase
            .from('inventory_items')
            .select('id')
            .eq('name', item.name)
            .maybeSingle();

          if (searchError) throw searchError;

          const dbItem: DBInventoryItem = {
            name: item.name || '',
            description: item.description || '',
            price: item.price || 0,
            stock: item.stock || 0,
            image_url: item.image_url || '',
            image_url_2: item.image_url_2 || null,
            image_url_3: item.image_url_3 || null,
            brand_name: item.brand_name || null,
            sizes: item.sizes || [],
            body_shapes: item.body_shapes || [],
            color_tones: item.color_tones || [],
            dress_type: item.dress_type || []
          };

          let inventoryItem;

          if (existingItems) {
            // Update existing item
            const { data: updatedItem, error: updateError } = await supabase
              .from('inventory_items')
              .update(dbItem)
              .eq('id', existingItems.id)
              .select()
              .single();

            if (updateError) throw updateError;
            inventoryItem = updatedItem;
          } else {
            // Insert new item
            const { data: newItem, error: insertError } = await supabase
              .from('inventory_items')
              .insert([dbItem])
              .select()
              .single();

            if (insertError) throw insertError;
            inventoryItem = newItem;
          }

          if (!inventoryItem) throw new Error('Failed to insert/update inventory item');

          // Handle dress attributes if provided
          if (item.dress_attributes) {
            const dressAttrs = JSON.parse(item.dress_attributes) as DressAttributes;
            
            // Check if dress attributes exist for this product
            const { data: existingAttrs, error: attrSearchError } = await supabase
              .from('dress_attributes')
              .select('id')
              .eq('product_id', inventoryItem.id)
              .maybeSingle();

            if (attrSearchError) throw attrSearchError;

            if (existingAttrs) {
              // Update existing attributes
              const { error: attrUpdateError } = await supabase
                .from('dress_attributes')
                .update({
                  fabric: dressAttrs.fabric,
                  length: dressAttrs.length,
                  primary_colour: dressAttrs.primary_colour,
                  primary_shades: dressAttrs.primary_shades,
                  pattern: dressAttrs.pattern,
                  neck: dressAttrs.neck,
                  occasion: dressAttrs.occasion,
                  print: dressAttrs.print,
                  shape: dressAttrs.shape,
                  sleeve_length: dressAttrs.sleeve_length,
                  sleeve_styling: dressAttrs.sleeve_styling
                })
                .eq('id', existingAttrs.id);

              if (attrUpdateError) throw attrUpdateError;
            } else {
              // Insert new attributes
              const { error: attrInsertError } = await supabase
                .from('dress_attributes')
                .insert([{
                  product_id: inventoryItem.id,
                  fabric: dressAttrs.fabric,
                  length: dressAttrs.length,
                  primary_colour: dressAttrs.primary_colour,
                  primary_shades: dressAttrs.primary_shades,
                  pattern: dressAttrs.pattern,
                  neck: dressAttrs.neck,
                  occasion: dressAttrs.occasion,
                  print: dressAttrs.print,
                  shape: dressAttrs.shape,
                  sleeve_length: dressAttrs.sleeve_length,
                  sleeve_styling: dressAttrs.sleeve_styling
                }]);

              if (attrInsertError) throw attrInsertError;
            }
          }
        }

        await fetchInventory();
      };

      reader.readAsText(file);
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items (
            id,
            quantity,
            price,
            inventory_item:inventory_items (
              id,
              name,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          order:orders (
            total_amount,
            shipping_address
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      setError(null);
      
      const { error } = await supabase
        .from('orders')
        .update({ order_status: status })
        .eq('id', orderId);

      if (error) throw error;
      
      // Refresh orders list
      fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status');
    }
  };

  const updateReturnStatus = async (returnId: string, status: 'approved' | 'rejected') => {
    try {
      setError(null);
      
      const { error } = await supabase
        .from('returns')
        .update({ status })
        .eq('id', returnId);

      if (error) throw error;
      
      // Refresh returns list
      fetchReturns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update return status');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = 
      returnItem.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.order.shipping_address.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || returnItem.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      setUploadError('Admin access required');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;
    setFileProcessing(true);

    // Reset status messages
    setUploadError(null);
    setUploadSuccess(null);

    // Validate file type
    if (file.type !== 'text/csv') {
      setUploadError('Please upload a CSV file');
      setFileProcessing(false);
      return;
    }

    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => 
        row.split(',').map(cell => {
          // Remove quotes and trim
          cell = cell.trim().replace(/^"|"$/g, '');
          // Handle empty cells
          return cell === '' ? null : cell;
        })
      );

      // Define required fields
      const requiredFields = ['name', 'description', 'price', 'image_url', 'sizes', 
                             'body_shapes', 'color_tones', 'dress_type', 'stock', "images 2", "images 3", "brand_name",  'dress_attributes'];

      // Validate header row
      const headers = rows[0];
      const missingFields = requiredFields.filter(field => !headers.includes(field));
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Process each row
      const items: CSVInventoryItem[] = [];
      for (let i = 1; i < rows.length; i++) {
        if (rows[i].length === 1 && !rows[i][0]) continue; // Skip empty rows
        
        const row = rows[i];
        if (row.length !== headers.length) {
          throw new Error(`Invalid number of columns in row ${i + 1}`);
        }

        const item: CSVInventoryItem = {};
        headers.forEach((headerOrNull: string | null, index: number) => {
          const header = headerOrNull || '';
          const rawValue = row[index];
          
          // Skip empty values for optional fields
          if ((!rawValue || rawValue === '') && !requiredFields.includes(header)) {
            return;
          }

          // Ensure we have a string to work with
          const stringValue = String(rawValue || '').trim();
          let value: any = stringValue;

          // Handle arrays
          if (['body_shapes', 'sizes', 'color_tones', 'dress_type'].includes(header)) {
            value = stringValue ? stringValue.split(';').filter(Boolean).map(val => val.trim()) : [];
          }
          
          // Handle dress attributes
          if (header === 'dress_attributes') {
            try {
              if (!stringValue) {
                throw new Error('Dress attributes cannot be empty');
              }
              
              // Parse the JSON string and validate the structure
              const parsedAttrs = JSON.parse(stringValue.replace(/\n/g, '')) as Partial<DressAttributes>;
              const requiredAttrs = [
                'fabric', 'length', 'primary_colour', 'primary_shades',
                'pattern', 'neck', 'occasion', 'print', 'shape',
                'sleeve_length', 'sleeve_styling'
              ];
              
              // Validate all required fields are present
              const missingAttrs = requiredAttrs.filter(attr => !(attr in parsedAttrs));
              if (missingAttrs.length > 0) {
                throw new Error(`Missing dress attributes: ${missingAttrs.join(', ')}`);
              }

              // Convert single values to arrays where needed
              const arrayFields = ['fabric', 'primary_colour', 'pattern', 'neck', 'occasion', 'print', 'shape'];
              arrayFields.forEach(field => {
                const value = parsedAttrs[field as keyof DressAttributes];
                if (value && !Array.isArray(value)) {
                  (parsedAttrs[field as keyof DressAttributes] as any) = [value];
                }
              });
              
              // Ensure primary_shades is always an array
              if (!Array.isArray(parsedAttrs.primary_shades)) {
                parsedAttrs.primary_shades = parsedAttrs.primary_shades ? [parsedAttrs.primary_shades as string] : [];
              }
              
              // Validate string fields
              if (typeof parsedAttrs.length !== 'string') {
                throw new Error('Length must be a string');
              }
              if (typeof parsedAttrs.sleeve_length !== 'string') {
                throw new Error('Sleeve length must be a string');
              }
              if (typeof parsedAttrs.sleeve_styling !== 'string') {
                throw new Error('Sleeve styling must be a string');
              }

              value = parsedAttrs as DressAttributes;
            } catch (error) {
              const err = error as Error;
              throw new Error(`Invalid dress attributes JSON at row ${i + 1}: ${err.message}`);
            }
          }

          // Convert numeric values
          if (header === 'price' || header === 'stock') {
            const num = Number(value);
            if (isNaN(num)) {
              throw new Error(`Invalid number in ${header} at row ${i + 1}`);
            }
            value = num;
          }

          if (header) {
            item[header] = value;
          }
        });

        items.push(item);
      }

      // Insert or update items in the database
      for (const item of items) {
        const { body_shapes, color_tones, dress_type, ...inventoryItem } = item;

        // Check if the item already exists
        const { data: existingItem, error: fetchError } = await supabase
          .from('inventory_items')
          .select('id')
          .eq('name', inventoryItem.name)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: No rows found
          throw fetchError;
        }

        if (existingItem) {
          // Update existing item
          const { error: itemError } = await supabase
            .from('inventory_items')
            .update(inventoryItem)
            .eq('id', existingItem.id);

          if (itemError) throw itemError;

          const { error: attrError } = await supabase
            .from('item_attributes')
            .update({ body_shapes, color_tones, dress_type })
            .eq('item_id', existingItem.id);

          if (attrError) throw attrError;
        } else {
          // Insert new item
          const { data: newItem, error: itemError } = await supabase
            .from('inventory_items')
            .insert([inventoryItem])
            .select()
            .single();

          if (itemError) throw itemError;

          const { error: attrError } = await supabase
            .from('item_attributes')
            .insert([{ item_id: newItem.id, body_shapes, color_tones, dress_type }]);

          if (attrError) throw attrError;
        }
      }

      setUploadSuccess(`Successfully imported ${items.length} items`);
      fetchInventory(); // Refresh inventory list
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to process file');
      console.error('Upload error:', err);
    } finally {
      setFileProcessing(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDeleteAllInventory = async () => {
    // Double confirmation to prevent accidents
    if (!confirm('Are you sure you want to delete ALL inventory items? This action cannot be undone.')) {
      return;
    }
    
    if (!confirm('FINAL WARNING: This will permanently delete all inventory items. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Delete all records from inventory_items
      // This will cascade delete related records in item_attributes due to foreign key constraints
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .neq('id', ''); // This will match all records

      if (error) throw error;
      
      setUploadSuccess('Successfully deleted all inventory items');
      fetchInventory(); // Refresh the empty inventory list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete inventory items');
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  // if (!isAdmin) {
  //   return null;
  // }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="flex items-center p-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUploadGuide(true)}
                className="p-2 text-gray-600 hover:text-gray-900"
                title="View Upload Guide"
              >
                <Info className="w-5 h-5" />
              </button>
              <button
                onClick={() => activeTab === 'orders' ? fetchOrders() : fetchReturns()}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <RefreshCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'orders'
                  ? 'border-indigo-500 text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'returns'
                  ? 'border-indigo-500 text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Returns
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'inventory'
                  ? 'border-indigo-500 text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Inventory
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Status</option>
                {activeTab === 'orders' ? (
                  <>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </>
                ) : (
                  <>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </>
                )}
              </select>
              {activeTab === 'inventory' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowInventoryForm(true);
                      setEditingItem(null);
                    }}
                    className="px-4 py-2 bg-black text-white rounded-lg"
                  >
                    Add Item
                  </button>
                  <label className="px-4 py-2 bg-gray-900 text-white rounded-lg cursor-pointer
                                hover:bg-gray-800 transition-colors flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <a
                    href="/template.csv"
                    download="inventory_template.csv"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg
                             hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Template
                  </a>
                  <button
                    onClick={handleDeleteAllInventory}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                              transition-colors flex items-center gap-2"
                  >
                    Delete All
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {uploadError && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">{uploadError}</div>
              <button
                onClick={() => setUploadError(null)}
                className="text-red-700 hover:text-red-800"
              >
                ×
              </button>
            </div>
          )}

          {uploadSuccess && (
            <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">{uploadSuccess}</div>
              <button
                onClick={() => setUploadSuccess(null)}
                className="text-green-700 hover:text-green-800"
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto" />
            </div>
          ) : activeTab === 'orders' ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ₹{order.total_amount}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.shipping_address.fullName}
                      </p>
                    </div>
                  </div>

                  {/* Display order items */}
                  {order.items && order.items.length > 0 && (
                    <div className="mb-4 border-t border-b border-gray-100 py-3">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Order Items:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                              <img 
                                src={item.inventory_item.image_url} 
                                alt={item.inventory_item.name}
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{item.inventory_item.name}</p>
                              <p className="text-xs text-gray-500">
                                Qty: {item.quantity} × ₹{item.price}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <select
                      value={order.order_status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    {order.order_status === 'shipped' && (
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Tracking Number"
                          value={order.tracking_number || ''}
                          onChange={async (e) => {
                            const { error } = await supabase
                              .from('orders')
                              .update({ tracking_number: e.target.value })
                              .eq('id', order.id);
                            if (error) setError('Failed to update tracking number');
                          }}
                          className="border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <input
                          type="text"
                          placeholder="Shipping Carrier"
                          value={order.shipping_carrier || ''}
                          onChange={async (e) => {
                            const { error } = await supabase
                              .from('orders')
                              .update({ shipping_carrier: e.target.value })
                              .eq('id', order.id);
                            if (error) setError('Failed to update shipping carrier');
                          }}
                          className="border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'inventory' ? (
            <>
              {showInventoryForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-4">
                      {editingItem ? 'Edit Item' : 'Add New Item'}
                    </h2>
                    <form onSubmit={handleInventorySubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={editingItem?.name}
                          className="w-full px-3 py-2 border rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          name="description"
                          defaultValue={editingItem?.description}
                          className="w-full px-3 py-2 border rounded-lg h-24"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Price</label>
                          <input
                            type="number"
                            name="price"
                            defaultValue={editingItem?.price}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border rounded-lg"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Stock</label>
                          <input
                            type="number"
                            name="stock"
                            defaultValue={editingItem?.stock}
                            min="0"
                            className="w-full px-3 py-2 border rounded-lg"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Image URL</label>
                        <input
                          type="url"
                          name="image_url"
                          defaultValue={editingItem?.image_url}
                          className="w-full px-3 py-2 border rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Body Shapes</label>
                        <input
                          type="text"
                          name="body_shapes"
                          defaultValue={editingItem?.item_attributes?.[0]?.body_shapes?.join(', ')}
                          placeholder="hourglass, pear, rectangle, etc."
                          className="w-full px-3 py-2 border rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Color Tones</label>
                        <input
                          type="text"
                          name="color_tones"
                          defaultValue={editingItem?.item_attributes?.[0]?.color_tones?.join(', ')}
                          placeholder="warm, cool, neutral"
                          className="w-full px-3 py-2 border rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Dress Type</label>
                        <input
                          type="text"
                          name="dress_type"
                          defaultValue={editingItem?.item_attributes?.[0]?.dress_type}
                          placeholder="casual, formal, etc."
                          className="w-full px-3 py-2 border rounded-lg"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowInventoryForm(false);
                            setEditingItem(null);
                          }}
                          className="px-4 py-2 border rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-black text-white rounded-lg"
                        >
                          {editingItem ? 'Update' : 'Add'} Item
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              <div className="grid md:grid-cols-3 gap-6">
                {inventory.map((item) => (
                  <div key={item.id} className="border  rounded-lg overflow-hidden">
                    <div className="h-[400px]">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      <div className="flex justify-between items-center mb-4">
                        <p className="font-medium text-gray-900">₹{item.price}</p>
                        <p className="text-sm text-gray-600">Stock: {item.stock}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium">Body Shapes:</span>{' '}
                          {item.item_attributes?.[0]?.body_shapes?.join(', ')}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Color Tones:</span>{' '}
                          {item.item_attributes?.[0]?.color_tones?.join(', ')}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Type:</span>{' '}
                          {item.item_attributes?.[0]?.dress_type}
                        </p>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setShowInventoryForm(true);
                          }}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this item?')) {
                              const { error } = await supabase
                                .from('inventory_items')
                                .delete()
                                .eq('id', item.id);
                              
                              if (error) {
                                setError('Failed to delete item');
                              } else {
                                fetchInventory();
                              }
                            }
                          }}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {filteredReturns.map((returnItem) => (
                <div
                  key={returnItem.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        Return #{returnItem.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Order #{returnItem.order_id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ${returnItem.order.total_amount}
                      </p>
                      <p className="text-sm text-gray-600">
                        {returnItem.order.shipping_address.fullName}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4">{returnItem.reason}</p>

                  {returnItem.status === 'pending' ? (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => updateReturnStatus(returnItem.id, 'approved')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Approve
                      </button>
                      <button
                        onClick={() => updateReturnStatus(returnItem.id, 'rejected')}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg"
                      >
                        <XCircle className="w-5 h-5" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <p className={`text-sm font-medium ${
                      returnItem.status === 'approved' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {returnItem.status.charAt(0).toUpperCase() + returnItem.status.slice(1)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}