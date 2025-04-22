import React, { useState, useEffect } from 'react';
import { Package, RefreshCcw, Search, CheckCircle, XCircle, Filter, Upload, Download, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';

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
  product_id?: string;
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
  dress_attributes?: string | DressAttributes;  // Can be either string (from CSV) or parsed DressAttributes
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
  const [brands, setBrands] = useState<any[]>([]);
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
    fetchBrands();
    fetchUploadFormat();
  }, []);

  const fetchBrands = async () => {
    try {
      console.log('Fetching brands...');
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('Name');

      if (error) {
        console.error('Error fetching brands:', error);
        throw error;
      }

      console.log('Fetched brands:', data);
      setBrands(data || []);
    } catch (err) {
      console.error('Error in fetchBrands:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch brands');
    }
  };

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

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
      fetchBrands();  // Fetch brands when inventory tab is active
    }
  }, [activeTab]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching inventory items...');
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          item_attributes (
            body_shapes,
            color_tones,
            dress_type
          ),
          brand:brand_id (
            id,
            Name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching inventory:', error);
        throw error;
      }

      console.log('Fetched inventory items:', data);
      setInventory(data || []);
    } catch (err) {
      console.error('Error in fetchInventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleInventorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      // Helper function to safely split strings into arrays
      const safeSplit = (value: string | null, separator: string = ','): string[] => {
        if (!value) return [];
        return value.split(separator).map(s => s.trim()).filter(Boolean);
      };

      const itemData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        price: parseFloat(formData.get('price') as string),
        stock: parseInt(formData.get('stock') as string),
        image_url: formData.get('image_url') as string,
        image_url_2: formData.get('image_url_2') as string || null,
        image_url_3: formData.get('image_url_3') as string || null,
        brand_id: formData.get('brand_id') as string || null,
        sizes: safeSplit(formData.get('sizes') as string),
        body_shapes: safeSplit(formData.get('body_shapes') as string),
        color_tones: safeSplit(formData.get('color_tones') as string),
        dress_type: safeSplit(formData.get('dress_type') as string)
      };

      const dressAttributes = {
        fabric: formData.get('fabric') as string || '',
        length: formData.get('length') as string || '',
        primary_colour: formData.get('primary_colour') as string || '',
        primary_shades: safeSplit(formData.get('primary_shades') as string),
        pattern: formData.get('pattern') as string || '',
        neck: formData.get('neck') as string || '',
        occasion: formData.get('occasion') as string || '',
        print: formData.get('print') as string || '',
        shape: formData.get('shape') as string || '',
        sleeve_length: formData.get('sleeve_length') as string || '',
        sleeve_styling: formData.get('sleeve_styling') as string || ''
      };

      // Combine dress type and attributes into a single JSON string
      const combinedDressData = JSON.stringify({
        types: itemData.dress_type,
        attributes: dressAttributes
      });

      if (editingItem) {
        // Update existing item
        const { error: itemError } = await supabase
            .from('inventory_items')
          .update({
            name: itemData.name,
            description: itemData.description,
            price: itemData.price,
            stock: itemData.stock,
            image_url: itemData.image_url,
            image_url_2: itemData.image_url_2,
            image_url_3: itemData.image_url_3,
            brand_id: itemData.brand_id
          })
          .eq('id', editingItem.id);

        if (itemError) throw itemError;

        // Update item attributes
        const { error: attrError } = await supabase
          .from('item_attributes')
          .update({
            body_shapes: itemData.body_shapes,
            color_tones: itemData.color_tones,
            dress_type: combinedDressData
          })
          .eq('item_id', editingItem.id);

        if (attrError) throw attrError;
          } else {
            // Insert new item
        const { data: newItem, error: itemError } = await supabase
              .from('inventory_items')
          .insert([{
            name: itemData.name,
            description: itemData.description,
            price: itemData.price,
            stock: itemData.stock,
            image_url: itemData.image_url,
            image_url_2: itemData.image_url_2,
            image_url_3: itemData.image_url_3,
            brand_id: itemData.brand_id
          }])
              .select()
              .single();

        if (itemError) throw itemError;
        if (!newItem) throw new Error('Failed to insert inventory item');

        // Insert item attributes
        const { error: attrError } = await supabase
          .from('item_attributes')
                .insert([{
            item_id: newItem.id,
            body_shapes: itemData.body_shapes,
            color_tones: itemData.color_tones,
            dress_type: combinedDressData
          }]);

        if (attrError) throw attrError;
      }

      setShowInventoryForm(false);
      setEditingItem(null);
      fetchInventory();
    } catch (err) {
      console.error('Error saving inventory item:', err);
      setError(err instanceof Error ? err.message : 'Failed to save inventory item');
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
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    setFileProcessing(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const text = await file.text();
      let items: any[];
      
      // Determine file type and parse accordingly
      if (file.name.toLowerCase().endsWith('.json')) {
        try {
          items = JSON.parse(text);
          if (!Array.isArray(items)) {
            throw new Error('JSON file must contain an array of items');
          }
        } catch (error) {
          throw new Error('Invalid JSON format. Please ensure the file contains valid JSON data.');
        }
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        try {
          // Use PapaParse for more robust CSV parsing
          const parseResult = Papa.parse(text, {
            header: true,
            skipEmptyLines: 'greedy', // Skip empty rows more aggressively
            transformHeader: (header) => header.trim().toLowerCase(), // Clean up and normalize headers
            transform: (value) => {
              // Clean up cell values
              if (typeof value === 'string') {
                value = value.trim();
                // Convert empty strings to null
                if (value === '') return null;
              }
              return value;
            }
          });
          
          if (parseResult.errors && parseResult.errors.length > 0) {
            console.warn('CSV parsing warnings:', parseResult.errors);
          }
          
          // Log the parsed data for debugging
          console.log('Parsed CSV data:', parseResult.data);
          
          items = parseResult.data.filter(item => {
            // Skip completely empty rows
            const hasAnyValue = Object.values(item as Record<string, unknown>).some(val => val !== null && val !== '');
            return hasAnyValue;
          });
        } catch (error) {
          console.error('CSV parsing error:', error);
          throw new Error('Invalid CSV format. Please check the file structure and try again.');
        }
      } else {
        throw new Error('Unsupported file format. Please upload a .json or .csv file.');
      }

      // Filter out empty items and validate required fields
      items = items.filter(item => {
        // Clean up the item data
        Object.keys(item).forEach(key => {
          if (item[key] === undefined || item[key] === null || item[key] === '') {
            item[key] = null;
          } else if (typeof item[key] === 'string') {
            item[key] = item[key].trim();
          }
        });

        // Check if item has any non-empty values
        const hasValues = Object.values(item).some(value => 
          value !== null && value !== '' &&
          (Array.isArray(value) ? value.length > 0 : true)
        );

        // Skip header-like rows
        const possibleHeaderRow = Object.entries(item).some(([key, value]) => {
          return typeof value === 'string' && 
                 key.toLowerCase().trim() === value.toLowerCase().trim();
        });
        
        if (possibleHeaderRow) {
          console.warn('Skipping header-like row:', item);
          return false;
        }

        return hasValues;
      });

      // Log filtered items for debugging
      console.log('Filtered items:', items);

      if (items.length === 0) {
        throw new Error('No valid items found in the file. Please check that the CSV format matches the template.');
      }

      // Process each item
      const processedItems: CSVInventoryItem[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          // Handle required fields
          const name = item.name?.toString().trim();
          const description = item.description?.toString().trim();
          let price = 0;
          
          if (typeof item.price === 'number') {
            price = item.price;
          } else if (typeof item.price === 'string') {
            // Remove currency symbols and convert to number
            price = parseFloat(item.price.replace(/[^0-9.-]+/g, '')) || 0;
          }
          
          let stock = 0;
          if (typeof item.stock === 'number') {
            stock = Math.max(0, Math.floor(item.stock)); // Ensure non-negative integer
          } else if (typeof item.stock === 'string') {
            stock = parseInt(item.stock.trim()) || 0;
          }

          // Validate required fields
          const validationErrors = [];
          if (!name) validationErrors.push('name is required');
          if (!description) validationErrors.push('description is required');
          if (price <= 0) validationErrors.push('price must be greater than 0');
          if (stock < 0) validationErrors.push('stock cannot be negative');

          if (validationErrors.length > 0) {
            errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
            console.warn(`Skipping row ${i + 1} due to validation errors:`, {
              row: item,
              errors: validationErrors
            });
            continue;
          }

          // Handle arrays with different possible separators
          const parseArrayField = (field: any): string[] => {
            if (!field) return [];
            if (Array.isArray(field)) return field.map(f => String(f).trim()).filter(Boolean);
            
            // Try different separators
            const separators = [';', ',', '|', '/'];
            for (const separator of separators) {
              if (String(field).includes(separator)) {
                return String(field).split(separator).map(s => s.trim()).filter(Boolean);
              }
            }
            
            // If no separators found, treat as single item
            const value = String(field).trim();
            return value ? [value] : [];
          };

          // Parse dress attributes and type
          let processedDressType: string[] = [];
          let processedDressAttrs: any = {};

          // First check if dress_type contains a JSON object
          if (item.dress_type && typeof item.dress_type === 'string' && 
              (item.dress_type.includes('{') || item.dress_type.includes('['))) {
            try {
              // Try to parse it as JSON if it looks like JSON
              let dressTypeObj;
              const cleanedJson = item.dress_type
                .replace(/^\s*["']?\s*{/g, '{')
                .replace(/}\s*["']?\s*$/g, '}')
                .replace(/([{,])\s*['"]?([^"'{}:,]+)['"]?\s*:/g, '$1"$2":') // Fix keys
                .replace(/:\s*['"]([^"',{}]+)['"]\s*([,}])/g, ':"$1"$2'); // Fix values
                
              dressTypeObj = JSON.parse(cleanedJson);
              
              // If it contains a types array, use that as dress_type
              if (dressTypeObj.types && Array.isArray(dressTypeObj.types)) {
                processedDressType = dressTypeObj.types;
              }
              
              // If it contains attributes, use that for dress_attributes
              if (dressTypeObj.attributes && typeof dressTypeObj.attributes === 'object') {
                processedDressAttrs = dressTypeObj.attributes;
              }
            } catch (e) {
              console.warn(`Failed to parse JSON in dress_type for item ${name}:`, e);
              // Fall back to treating it as a regular string with separators
              processedDressType = parseArrayField(item.dress_type);
            }
          } else {
            // Normal processing for non-JSON dress_type
            processedDressType = parseArrayField(item.dress_type);
          }

          // Process dress_attributes if not already set from dress_type JSON
          if (Object.keys(processedDressAttrs).length === 0) {
            if (item.dress_attributes) {
              try {
                if (typeof item.dress_attributes === 'string') {
                  // Clean up the JSON string for common issues
                  let jsonStr = item.dress_attributes
                    .replace(/^\s*["']?\s*{/g, '{')
                    .replace(/}\s*["']?\s*$/g, '}')
                    .replace(/([{,])\s*['"]?([^"'{}:,]+)['"]?\s*:/g, '$1"$2":') // Fix keys
                    .replace(/:\s*['"]([^"',{}]+)['"]\s*([,}])/g, ':"$1"$2') // Fix values
                    .replace(/\\"/g, '"')
                    .replace(/"{2,}/g, '"');
                  
                  try {
                    processedDressAttrs = JSON.parse(jsonStr);
                  } catch (parseError) {
                    console.warn(`Failed to parse dress_attributes JSON for item ${name}:`, parseError);
                    console.warn('Attempted to parse:', jsonStr);
                    // Try to create dress attributes from individual columns if they exist
                    processedDressAttrs = {
                      fabric: item.fabric || '',
                      length: item.length || '',
                      primary_colour: item.primary_colour || '',
                      primary_shades: parseArrayField(item.primary_shades),
                      pattern: item.pattern || '',
                      neck: item.neck || '',
                      occasion: item.occasion || '',
                      print: item.print || '',
                      shape: item.shape || '',
                      sleeve_length: item.sleeve_length || '',
                      sleeve_styling: item.sleeve_styling || ''
                    };
                  }
                } else if (typeof item.dress_attributes === 'object') {
                  processedDressAttrs = item.dress_attributes;
                }
              } catch (error) {
                console.error('Error processing dress attributes:', error);
                processedDressAttrs = {}; // Use empty object if parsing fails
              }
            } else {
              // Try to create dress attributes from individual columns if they exist
              processedDressAttrs = {
                fabric: item.fabric || '',
                length: item.length || '',
                primary_colour: item.primary_colour || '',
                primary_shades: parseArrayField(item.primary_shades),
                pattern: item.pattern || '',
                neck: item.neck || '',
                occasion: item.occasion || '',
                print: item.print || '',
                shape: item.shape || '',
                sleeve_length: item.sleeve_length || '',
                sleeve_styling: item.sleeve_styling || ''
              };
            }
          }

          // Clean up brand_id
          let brandId = null;
          if (item.brand_id) {
            brandId = String(item.brand_id).trim();
          }

          const processedItem: CSVInventoryItem = {
            name: name,
            description: description,
            price: price,
            stock: stock,
            image_url: item.image_url?.toString() || '',
            image_url_2: item.image_url_2?.toString() || null,
            image_url_3: item.image_url_3?.toString() || null,
            brand_id: brandId,
            sizes: parseArrayField(item.sizes),
            body_shapes: parseArrayField(item.body_shapes),
            color_tones: parseArrayField(item.color_tones),
            dress_type: processedDressType,
            dress_attributes: processedDressAttrs
          };

          processedItems.push(processedItem);
        } catch (itemError) {
          const errorMessage = itemError instanceof Error ? itemError.message : 'Unknown error during processing';
          console.error(`Error processing item at index ${i}:`, itemError);
          errors.push(`Row ${i+1}: ${errorMessage}`);
        }
      }

      if (processedItems.length === 0) {
        throw new Error('No valid items could be processed. Please check the file format and required fields.');
      }

      // Log processing results
      console.log(`Processed ${processedItems.length} items successfully`);
      if (errors.length > 0) {
        console.warn(`Encountered ${errors.length} errors during processing:`, errors);
      }

      // Insert or update items in the database
      for (const item of processedItems) {
        const { dress_attributes, body_shapes, color_tones, dress_type, ...inventoryItem } = item;
        const processedDressType: string[] = Array.isArray(dress_type) ? dress_type : [];
        const processedDressAttrs: Record<string, any> = typeof dress_attributes === 'object' ? dress_attributes || {} : {};

        try {
          // Check if the item already exists using ilike for case-insensitive matching
          const { data: existingItems, error: fetchError } = await supabase
            .from('inventory_items')
            .select('id')
            .ilike('name', inventoryItem.name || '')
            .limit(1);

          if (fetchError) {
            console.error('Error checking for existing item:', fetchError);
            throw new Error(`Failed to check for existing item: ${fetchError.message}`);
          }

          let itemId: string;
          const existingItem = existingItems?.[0];

          if (existingItem) {
            // Update existing item
            const { error: itemError } = await supabase
              .from('inventory_items')
              .update({
                ...inventoryItem,
                brand_id: inventoryItem.brand_id || null, // Ensure brand_id is explicitly set
                dress_attributes: processedDressAttrs // Store dress attributes in inventory_items
              })
              .eq('id', existingItem.id);

            if (itemError) throw itemError;
            itemId = existingItem.id;

            // Update item attributes
            const { error: attrError } = await supabase
              .from('item_attributes')
              .update({
                body_shapes: body_shapes,
                color_tones: color_tones,
                dress_type: processedDressType
              })
              .eq('item_id', existingItem.id);

            if (attrError) throw attrError;
          } else {
            // Insert new item
            const { data: newItem, error: itemError } = await supabase
              .from('inventory_items')
              .insert([{
                ...inventoryItem,
                brand_id: inventoryItem.brand_id || null, // Ensure brand_id is explicitly set
                dress_attributes: processedDressAttrs // Store dress attributes in inventory_items
              }])
              .select()
              .single();

            if (itemError) throw itemError;
            if (!newItem) throw new Error('Failed to insert inventory item');
            itemId = newItem.id;

            // Insert item attributes
            const { error: attrError } = await supabase
              .from('item_attributes')
              .insert([{
                item_id: itemId,
                body_shapes: body_shapes,
                color_tones: color_tones,
                dress_type: processedDressType
              }]);

            if (attrError) throw attrError;
          }
        } catch (dbError) {
          const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
          console.error('Database operation failed for item:', item.name, dbError);
          errors.push(`Database error for ${item.name}: ${errorMessage}`);
        }
      }

      // Show success with details about any skipped items
      if (errors.length > 0) {
        setUploadSuccess(`Successfully imported ${processedItems.length} items. ${errors.length} items were skipped due to errors.`);
      } else {
        setUploadSuccess(`Successfully imported all ${processedItems.length} items`);
      }
      
      fetchInventory(); // Refresh inventory list
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to process file');
      console.error('Upload error:', err);
    } finally {
      setFileProcessing(false);
      e.target.value = ''; // Reset file input
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
                    Upload File
                    <input
                      type="file"
                      accept=".csv,.json"
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
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
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
                      <div>
                        <label className="block text-sm font-medium mb-1">Price</label>
                        <input
                          type="number"
                          name="price"
                          defaultValue={editingItem?.price}
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
                          className="w-full px-3 py-2 border rounded-lg"
                          required
                        />
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
                        <label className="block text-sm font-medium mb-1">Additional Image URL 1 (Optional)</label>
                        <input
                          type="url"
                          name="image_url_2"
                          defaultValue={editingItem?.image_url_2}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Additional Image URL 2 (Optional)</label>
                        <input
                          type="url"
                          name="image_url_3"
                          defaultValue={editingItem?.image_url_3}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Brand</label>
                        <select
                          name="brand_id"
                          defaultValue={editingItem?.brand_id || ''}
                          className="w-full px-3 py-2 border rounded-lg"
                          required
                        >
                          <option value="">Select Brand</option>
                          {brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                              {brand.Name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Sizes</label>
                        <input
                          type="text"
                          name="sizes"
                          defaultValue={editingItem?.sizes?.join(', ')}
                          placeholder="S, M, L, XL"
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
                          defaultValue={editingItem?.item_attributes?.[0]?.dress_type?.join(', ')}
                          placeholder="casual, formal, etc."
                          className="w-full px-3 py-2 border rounded-lg"
                          required
                        />
                      </div>
                      {/* Dress Attributes Section */}
                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-lg font-medium mb-4">Dress Attributes</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Fabric</label>
                            <input
                              type="text"
                              name="fabric"
                              defaultValue={editingItem?.dress_attributes?.fabric}
                              placeholder="Linen Blend, Cotton, etc."
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Length</label>
                            <select
                              name="length"
                              defaultValue={editingItem?.dress_attributes?.length}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              <option value="">Select Length</option>
                              <option value="Mini">Mini</option>
                              <option value="Knee">Knee</option>
                              <option value="Midi">Midi</option>
                              <option value="Maxi">Maxi</option>
                              <option value="Long">Long</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Primary Color</label>
                            <input
                              type="text"
                              name="primary_colour"
                              defaultValue={editingItem?.dress_attributes?.primary_colour}
                              placeholder="Red, Blue, etc."
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Primary Shades</label>
                            <input
                              type="text"
                              name="primary_shades"
                              defaultValue={editingItem?.dress_attributes?.primary_shades?.join(', ')}
                              placeholder="Light, Bright, Dark, etc."
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Pattern</label>
                            <input
                              type="text"
                              name="pattern"
                              defaultValue={editingItem?.dress_attributes?.pattern}
                              placeholder="Solid, Floral, etc."
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Neck</label>
                            <input
                              type="text"
                              name="neck"
                              defaultValue={editingItem?.dress_attributes?.neck}
                              placeholder="Round, V-neck, etc."
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Occasion</label>
                            <input
                              type="text"
                              name="occasion"
                              defaultValue={editingItem?.dress_attributes?.occasion}
                              placeholder="Casual, Formal, etc."
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Print</label>
                            <input
                              type="text"
                              name="print"
                              defaultValue={editingItem?.dress_attributes?.print}
                              placeholder="None, Floral, etc."
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Shape</label>
                            <input
                              type="text"
                              name="shape"
                              defaultValue={editingItem?.dress_attributes?.shape}
                              placeholder="A-Line, Sheath, etc."
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Sleeve Length</label>
                            <select
                              name="sleeve_length"
                              defaultValue={editingItem?.dress_attributes?.sleeve_length}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              <option value="">Select Sleeve Length</option>
                              <option value="Sleeveless">Sleeveless</option>
                              <option value="Short">Short</option>
                              <option value="Half">Half</option>
                              <option value="Three-Quarter">Three-Quarter</option>
                              <option value="Long">Long</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Sleeve Styling</label>
                            <input
                              type="text"
                              name="sleeve_styling"
                              defaultValue={editingItem?.dress_attributes?.sleeve_styling}
                              placeholder="Regular, Puff, etc."
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                        </div>
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
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    <div className="h-[400px] relative group cursor-pointer" onClick={() => navigate(`/product/${item.id}`)}>
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-200" />
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
                        <p className="text-sm">
                          <span className="font-medium">Brand:</span>{' '}
                          {item.brand?.Name || 'No brand assigned'}
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
                <div key={returnItem.id} className="border border-gray-200 rounded-lg p-4">
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