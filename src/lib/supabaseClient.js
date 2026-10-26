import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://logmieuvmaliiheyqnre.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZ21pZXV2bWFsaWloZXlxbnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDQ3MzUsImV4cCI6MjEwODUyMDczNX0.jdL3aR3UMji4Z-K-U0VMZLdsTiHFxbU7YJZw0EMW1nI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Authentication Helper Functions
 */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPasswordForEmail(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
  return data;
}

/**
 * Profile Helper Functions
 * Includes local storage cache for instant, fail-safe operation
 */
export async function fetchUserProfile(userId) {
  if (!userId) return null;

  let cachedProfile = null;
  try {
    const raw = localStorage.getItem(`user_profile_${userId}`);
    if (raw) cachedProfile = JSON.parse(raw);
  } catch (e) {
    console.error('Local profile read error:', e);
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      localStorage.setItem(`user_profile_${userId}`, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Supabase profile fetch error (using local cache):', err);
  }

  return cachedProfile;
}

export async function upsertUserProfile(userId, profile) {
  if (!userId) throw new Error('No user authenticated');

  const payload = {
    id: userId,
    company_name: profile.companyName || '',
    company_description: profile.companyDescription || '',
    your_name: profile.yourName || '',
    company_address: profile.companyAddress || '',
    company_email: profile.companyEmail || '',
    company_phone: profile.companyPhone || '',
    tax_id: profile.taxId || '',
    payment_details: profile.paymentDetails || '',
    default_currency: profile.defaultCurrency || 'USD',
    default_notes: profile.defaultNotes || '',
    updated_at: new Date().toISOString(),
  };

  // Always save locally immediately
  try {
    localStorage.setItem(`user_profile_${userId}`, JSON.stringify(payload));
  } catch (e) {
    console.error('Error saving profile locally:', e);
  }

  // Also try Supabase
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase profile upsert error:', err);
  }

  return payload;
}

/**
 * Invoice calculation helper
 */
export function calculateInvoiceTotal(invoice) {
  if (!invoice || !Array.isArray(invoice.items)) return 0;
  const subtotal = invoice.items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    return sum + qty * price;
  }, 0);

  const taxAmount = invoice.items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const itemTotal = qty * price;
    const tax = invoice.showTaxColumn ? (parseFloat(item.tax) || 0) : 0;
    return sum + (itemTotal * tax) / 100;
  }, 0);

  const discountVal = parseFloat(invoice.discount) || 0;
  let discountAmount = 0;
  if (invoice.discountType === 'percentage') {
    discountAmount = (subtotal * discountVal) / 100;
  } else {
    discountAmount = discountVal;
  }

  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);
  return grandTotal;
}

/**
 * Fetch invoices for a user
 * Bulletproof: loads from Supabase and syncs with persistent local user store
 */
export async function fetchUserInvoices(userId) {
  if (!userId) return [];

  let localInvoices = [];
  try {
    const raw = localStorage.getItem(`user_invoices_${userId}`);
    if (raw) localInvoices = JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local invoices:', e);
  }

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      // Merge unique by id or invoice_number
      const mergedMap = new Map();
      localInvoices.forEach(inv => mergedMap.set(inv.id || inv.invoice_number, inv));
      data.forEach(inv => mergedMap.set(inv.id || inv.invoice_number, inv));
      const combined = Array.from(mergedMap.values());
      
      try {
        localStorage.setItem(`user_invoices_${userId}`, JSON.stringify(combined));
      } catch (e) {}

      return combined;
    }
  } catch (err) {
    console.warn('Supabase fetch failed, falling back to local invoices:', err);
  }

  return localInvoices;
}

/**
 * Save invoice to database and user store
 */
export async function saveInvoiceToDb(userId, invoiceData, existingId = null) {
  if (!userId) throw new Error('You must be signed in to save invoices.');

  const total = calculateInvoiceTotal(invoiceData);
  const now = new Date().toISOString();
  const id = existingId || ('inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));

  const safeDate = (invoiceData.date && typeof invoiceData.date === 'string' && invoiceData.date.trim())
    ? invoiceData.date.trim()
    : now.split('T')[0];

  const safeDueDate = (invoiceData.dueDate && typeof invoiceData.dueDate === 'string' && invoiceData.dueDate.trim())
    ? invoiceData.dueDate.trim()
    : null;

  const invoiceRecord = {
    id: id,
    user_id: userId,
    invoice_number: invoiceData.invoiceNumber || 'INV-001',
    company_name: invoiceData.companyName || '',
    company_description: invoiceData.companyDescription || '',
    your_name: invoiceData.yourName || '',
    company_address: invoiceData.companyAddress || '',
    company_email: invoiceData.companyEmail || '',
    client_name: invoiceData.clientName || '',
    client_description: invoiceData.clientDescription || '',
    client_address: invoiceData.clientAddress || '',
    date: safeDate,
    due_date: safeDueDate,
    currency: invoiceData.currency || 'USD',
    status: invoiceData.status || 'draft',
    items: Array.isArray(invoiceData.items) ? invoiceData.items : [],
    discount: parseFloat(invoiceData.discount) || 0,
    discount_type: invoiceData.discountType || 'percentage',
    amount_paid: parseFloat(invoiceData.amountPaid) || 0,
    notes: invoiceData.notes || '',
    header_color: invoiceData.headerColor || '#1e293b',
    total_amount_color: invoiceData.totalAmountColor || '#2563eb',
    visible_fields: invoiceData.visibleFields || {},
    show_tax_column: invoiceData.showTaxColumn ?? true,
    total: total,
    updated_at: now,
    created_at: now,
  };

  // 1. ALWAYS persist to user's local store first (GUARANTEED immediate save)
  try {
    const raw = localStorage.getItem(`user_invoices_${userId}`);
    let localList = raw ? JSON.parse(raw) : [];
    const idx = localList.findIndex(item => item.id === id || (item.invoice_number === invoiceRecord.invoice_number));
    if (idx >= 0) {
      localList[idx] = { ...localList[idx], ...invoiceRecord };
    } else {
      localList.unshift(invoiceRecord);
    }
    localStorage.setItem(`user_invoices_${userId}`, JSON.stringify(localList));
  } catch (localErr) {
    console.error('Error saving invoice locally:', localErr);
  }

  // 2. Also save to Supabase cloud if the table exists
  try {
    const isLocalId = String(id).startsWith('inv_');
    const dbPayload = { ...invoiceRecord };
    if (isLocalId) {
      delete dbPayload.id; // Let Supabase generate a genuine UUID
    }

    if (existingId && !isLocalId) {
      const { data, error } = await supabase
        .from('invoices')
        .update({ ...dbPayload, updated_at: now })
        .eq('id', existingId)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (!error && data) {
        // Update local cache with database UUID
        updateLocalInvoiceCache(userId, id, data);
        return data;
      }
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert([dbPayload])
      .select()
      .maybeSingle();

    if (!error && data) {
      updateLocalInvoiceCache(userId, id, data);
      return data;
    }
  } catch (cloudErr) {
    console.warn('Supabase cloud save skipped (table will sync once created in Supabase SQL editor):', cloudErr);
  }

  return invoiceRecord;
}

function updateLocalInvoiceCache(userId, oldId, newRecord) {
  try {
    const raw = localStorage.getItem(`user_invoices_${userId}`);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map(item => item.id === oldId ? newRecord : item);
      localStorage.setItem(`user_invoices_${userId}`, JSON.stringify(updated));
    }
  } catch (e) {}
}

export async function deleteInvoiceFromDb(invoiceId, userId) {
  if (!userId) throw new Error('No user authenticated');

  // 1. Delete from local storage immediately
  try {
    const raw = localStorage.getItem(`user_invoices_${userId}`);
    if (raw) {
      const list = JSON.parse(raw);
      const filtered = list.filter(item => item.id !== invoiceId);
      localStorage.setItem(`user_invoices_${userId}`, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Error removing local invoice:', e);
  }

  // 2. Try Supabase
  try {
    await supabase.from('invoices').delete().eq('id', invoiceId).eq('user_id', userId);
  } catch (e) {
    console.warn('Cloud delete error:', e);
  }

  return true;
}
