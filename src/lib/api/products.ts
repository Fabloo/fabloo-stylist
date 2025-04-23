import { supabase } from '../supabase';

export interface ProductFilter {
  brand_name?: string[];
  fabric?: string[];
  length?: string[];
  color?: string[];
  pattern?: string[];
  neck?: string[];
  occasion?: string[];
  print?: string[];
  shape?: string[];
  sleeve_length?: string[];
  sleeve_styling?: string[];
  minPrice?: number;
  maxPrice?: number;
  [key: string]: string[] | number | undefined;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  image_url_2?: string;
  image_url_3?: string;
  brand_id?: string;
  brand?: {
    id: string;
    Name: string;
  };
  dress_attributes?: {
    fabric?: string;
    length?: string;
    primary_colour?: string;
    primary_shades?: string[];
    pattern?: string;
    neck?: string;
    occasion?: string;
    print?: string;
    shape?: string;
    sleeve_length?: string;
    sleeve_styling?: string;
  };
  item_attributes?: {
    body_shapes?: string[];
    color_tones?: string[];
    dress_type?: string[];
  };
}

export async function getFilteredProducts(filters: ProductFilter) {
  const {
    fabric,
    length,
    primary_colour,
    primary_shades,
    pattern,
    neck,
    occasion,
    print,
    shape,
    sleeve_length,
    sleeve_styling,
    brand_id,
    minPrice,
    maxPrice,
    page = 1,
    limit = 20,
    sort = 'created_at',
    order = 'desc'
  } = filters;

  let query = supabase
    .from('inventory_items')
    .select(`
      *,
      brand:brand_id (
        id,
        Name
      ),
      item_attributes (
        body_shapes,
        color_tones,
        dress_type
      )
    `);

  // Apply JSON attribute filters
  if (fabric?.length) {
    query = query.contains('dress_attributes->fabric', fabric);
  }
  if (length?.length) {
    query = query.contains('dress_attributes->length', length);
  }
  if (primary_colour?.length) {
    query = query.contains('dress_attributes->primary_colour', primary_colour);
  }
  if (primary_shades?.length) {
    query = query.contains('dress_attributes->primary_shades', primary_shades);
  }
  if (pattern?.length) {
    query = query.contains('dress_attributes->pattern', pattern);
  }
  if (neck?.length) {
    query = query.contains('dress_attributes->neck', neck);
  }
  if (occasion?.length) {
    query = query.contains('dress_attributes->occasion', occasion);
  }
  if (print?.length) {
    query = query.contains('dress_attributes->print', print);
  }
  if (shape?.length) {
    query = query.contains('dress_attributes->shape', shape);
  }
  if (sleeve_length?.length) {
    query = query.contains('dress_attributes->sleeve_length', sleeve_length);
  }
  if (sleeve_styling?.length) {
    query = query.contains('dress_attributes->sleeve_styling', sleeve_styling);
  }

  // Apply brand filter
  if (brand_id?.length) {
    query = query.in('brand_id', brand_id);
  }

  // Apply price range filter
  if (minPrice !== undefined) {
    query = query.gte('price', minPrice);
  }
  if (maxPrice !== undefined) {
    query = query.lte('price', maxPrice);
  }

  // Apply sorting
  query = query.order(sort, { ascending: order === 'asc' });

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    products: data as Product[],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

export async function getFilterOptions() {
  const { data: products, error } = await supabase
    .from('inventory_items')
    .select('dress_attributes, brand_id');

  if (error) {
    throw error;
  }

  const options = {
    fabric: new Set<string>(),
    length: new Set<string>(),
    primary_colour: new Set<string>(),
    primary_shades: new Set<string>(),
    pattern: new Set<string>(),
    neck: new Set<string>(),
    occasion: new Set<string>(),
    print: new Set<string>(),
    shape: new Set<string>(),
    sleeve_length: new Set<string>(),
    sleeve_styling: new Set<string>(),
    brand_id: new Set<string>()
  };

  products.forEach(product => {
    const attrs = product.dress_attributes;
    if (attrs) {
      if (attrs.fabric) options.fabric.add(attrs.fabric);
      if (attrs.length) options.length.add(attrs.length);
      if (attrs.primary_colour) options.primary_colour.add(attrs.primary_colour);
      if (attrs.primary_shades) attrs.primary_shades.forEach(shade => options.primary_shades.add(shade));
      if (attrs.pattern) options.pattern.add(attrs.pattern);
      if (attrs.neck) options.neck.add(attrs.neck);
      if (attrs.occasion) options.occasion.add(attrs.occasion);
      if (attrs.print) options.print.add(attrs.print);
      if (attrs.shape) options.shape.add(attrs.shape);
      if (attrs.sleeve_length) options.sleeve_length.add(attrs.sleeve_length);
      if (attrs.sleeve_styling) options.sleeve_styling.add(attrs.sleeve_styling);
    }
    if (product.brand_id) options.brand_id.add(product.brand_id);
  });

  // Convert Sets to sorted arrays
  return {
    fabric: Array.from(options.fabric).sort(),
    length: Array.from(options.length).sort(),
    primary_colour: Array.from(options.primary_colour).sort(),
    primary_shades: Array.from(options.primary_shades).sort(),
    pattern: Array.from(options.pattern).sort(),
    neck: Array.from(options.neck).sort(),
    occasion: Array.from(options.occasion).sort(),
    print: Array.from(options.print).sort(),
    shape: Array.from(options.shape).sort(),
    sleeve_length: Array.from(options.sleeve_length).sort(),
    sleeve_styling: Array.from(options.sleeve_styling).sort(),
    brand_id: Array.from(options.brand_id).sort()
  };
} 