import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  FileText, 
  PlusCircle, 
  Calendar, 
  Edit3, 
  Copy, 
  Trash2, 
  Loader2, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  RotateCw,
  Cloud
} from 'lucide-react';
import { fetchUserInvoices, deleteInvoiceFromDb, saveInvoiceToDb } from '../lib/supabaseClient';

export default function InvoiceHistoryModal({
  isOpen,
  onClose,
  user,
  onLoadInvoice,
  onNewInvoice,
  onSaveCurrentInvoice,
  showToast,
  currentInvoiceId
}) {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, draft, sent, paid, overdue
  const [deletingId, setDeletingId] = useState(null);

  const loadInvoices = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchUserInvoices(user.id);
      setInvoices(data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      const msg = err.message || 'Failed to load invoice history.';
      setErrorMessage(msg);
      showToast(msg, 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCurrentNow = async () => {
    if (!onSaveCurrentInvoice) return;
    setIsSavingCurrent(true);
    try {
      await onSaveCurrentInvoice();
      await loadInvoices();
    } catch (err) {
      console.error('Save current invoice failed:', err);
    } finally {
      setIsSavingCurrent(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      loadInvoices();
    }
  }, [isOpen, user]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        (inv.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.company_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const totalCount = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    return { totalCount, totalAmount, paidAmount };
  }, [invoices]);

  if (!isOpen) return null;

  const handleDelete = async (id, invNum) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invNum || ''}? This cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteInvoiceFromDb(id, user.id);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      showToast(`Invoice ${invNum || ''} deleted successfully.`, 'info');
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('Failed to delete invoice.', 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (inv) => {
    try {
      const newInvoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      const duplicatedData = {
        invoiceNumber: newInvoiceNumber,
        companyName: inv.company_name,
        companyDescription: inv.company_description,
        yourName: inv.your_name,
        companyAddress: inv.company_address,
        companyEmail: inv.company_email,
        clientName: inv.client_name,
        clientDescription: inv.client_description,
        clientAddress: inv.client_address,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: inv.currency || 'USD',
        status: 'draft',
        items: inv.items || [],
        discount: inv.discount || 0,
        discountType: inv.discount_type || 'percentage',
        amountPaid: 0,
        notes: inv.notes || '',
        headerColor: inv.header_color || '#1e293b',
        totalAmountColor: inv.total_amount_color || '#2563eb',
        visibleFields: inv.visible_fields || {},
        showTaxColumn: inv.show_tax_column ?? true,
      };

      const saved = await saveInvoiceToDb(user.id, duplicatedData);
      setInvoices(prev => [saved, ...prev]);
      showToast(`Duplicated as new invoice ${newInvoiceNumber}!`, 'success');
      
      // Auto-load duplicate into editor
      onLoadInvoice(saved);
      onClose();
    } catch (err) {
      console.error('Duplicate failed:', err);
      showToast('Failed to duplicate invoice.', 'danger');
    }
  };

  const handleSelectInvoice = (inv) => {
    onLoadInvoice(inv);
    onClose();
    showToast(`Loaded invoice ${inv.invoice_number}`, 'info');
  };

  const formatCurrency = (amount, currency = 'USD') => {
    const symbolMap = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      CAD: 'CA$',
      AUD: 'AU$',
      AED: 'AED ',
      SAR: 'SAR ',
      JPY: '¥'
    };
    const sym = symbolMap[currency] || (currency + ' ');
    return `${sym}${(parseFloat(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="status-badge status-paid"><CheckCircle2 size={12} /> Paid</span>;
      case 'sent':
        return <span className="status-badge status-sent"><Clock size={12} /> Sent</span>;
      case 'overdue':
        return <span className="status-badge status-overdue"><AlertTriangle size={12} /> Overdue</span>;
      default:
        return <span className="status-badge status-draft">Draft</span>;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card history-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="auth-header-title">
            <div className="auth-icon-badge">
              <FileText size={20} className="text-primary" />
            </div>
            <div>
              <h3>Saved Invoices History</h3>
              <p className="modal-subtitle">
                Access, edit, duplicate, and manage all your cloud-saved invoices.
              </p>
            </div>
          </div>
          <div className="history-header-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={loadInvoices}
              title="Refresh list"
              disabled={isLoading}
            >
              <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Top Statistics */}
        <div className="history-stats-bar">
          <div className="history-stat-box">
            <span className="stat-label">Total Invoices</span>
            <span className="stat-value">{stats.totalCount}</span>
          </div>
          <div className="history-stat-box">
            <span className="stat-label">Total Invoiced</span>
            <span className="stat-value text-primary">{formatCurrency(stats.totalAmount)}</span>
          </div>
          <div className="history-stat-box">
            <span className="stat-label">Total Collected (Paid)</span>
            <span className="stat-value text-success">{formatCurrency(stats.paidAmount)}</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="history-toolbar">
          <div className="history-search-input-wrapper">
            <Search size={16} className="history-search-icon" />
            <input
              type="text"
              placeholder="Search by invoice # or client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field history-search-input"
            />
          </div>

          <div className="history-filter-chips">
            {['all', 'draft', 'sent', 'paid', 'overdue'].map((st) => (
              <button
                key={st}
                type="button"
                className={`history-filter-chip ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices List / Table */}
        <div className="history-list-container">
          {errorMessage && (
            <div className="auth-alert auth-alert-error" style={{ margin: '1rem 1.5rem' }}>
              <AlertTriangle size={20} />
              <div>
                <strong className="block font-semibold">Database Error:</strong>
                <p className="text-xs mt-0.5">{errorMessage}</p>
                {errorMessage.toLowerCase().includes('relation') && (
                  <p className="text-xs font-semibold mt-1 text-red-700">
                    💡 The `invoices` table does not exist in Supabase yet. Please run the second table (`CREATE TABLE invoices...`) in your Supabase SQL Editor.
                  </p>
                )}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="history-empty-state">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p>Loading your invoices...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="history-empty-state">
              <FileText size={44} className="text-muted" />
              <h4>No invoices saved in cloud yet</h4>
              <p>
                {searchQuery || statusFilter !== 'all'
                  ? 'No invoices match your current search or status filter.'
                  : "You haven't saved any invoices to your cloud account yet. You can save the invoice you're currently editing right now:"}
              </p>
              
              <div className="flex gap-2.5 flex-wrap justify-center mt-2">
                {onSaveCurrentInvoice && (
                  <button
                    type="button"
                    disabled={isSavingCurrent}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                    onClick={handleSaveCurrentNow}
                  >
                    {isSavingCurrent ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Saving Current Invoice...</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={15} />
                        <span>Save Current Invoice Now</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-sm flex items-center gap-1.5"
                  onClick={() => {
                    onClose();
                    onNewInvoice();
                  }}
                >
                  <PlusCircle size={15} />
                  <span>Start New Invoice</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="history-table-wrapper">
              {/* Desktop Table View */}
              <table className="history-table hidden sm:table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const isCurrent = currentInvoiceId === inv.id;
                    return (
                      <tr key={inv.id} className={isCurrent ? 'row-active-invoice' : ''}>
                        <td>
                          <div className="history-inv-number">
                            <span className="font-semibold text-primary">{inv.invoice_number}</span>
                            {isCurrent && <span className="current-badge">Currently Editing</span>}
                          </div>
                        </td>
                        <td>
                          <div className="history-client-cell">
                            <span className="font-medium">{inv.client_name || 'No client specified'}</span>
                            {inv.client_description && (
                              <span className="history-client-sub">{inv.client_description}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="history-date-cell">
                            <span>{inv.date || '-'}</span>
                            {inv.due_date && <span className="history-due-date">Due: {inv.due_date}</span>}
                          </div>
                        </td>
                        <td>
                          {getStatusBadge(inv.status)}
                        </td>
                        <td className="text-right font-bold">
                          {formatCurrency(inv.total, inv.currency)}
                        </td>
                        <td className="text-right">
                          <div className="history-action-buttons">
                            <button
                              type="button"
                              className="btn-icon-action"
                              title="Load and edit this invoice"
                              onClick={() => handleSelectInvoice(inv)}
                            >
                              <Edit3 size={15} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action"
                              title="Duplicate as new invoice"
                              onClick={() => handleDuplicate(inv)}
                            >
                              <Copy size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action text-danger"
                              title="Delete this invoice"
                              disabled={deletingId === inv.id}
                              onClick={() => handleDelete(inv.id, inv.invoice_number)}
                            >
                              {deletingId === inv.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Cards View */}
              <div className="history-mobile-cards sm:hidden">
                {filteredInvoices.map((inv) => {
                  const isCurrent = currentInvoiceId === inv.id;
                  return (
                    <div key={inv.id} className={`history-mobile-card ${isCurrent ? 'row-active-invoice' : ''}`}>
                      <div className="history-card-header">
                        <div className="history-inv-number">
                          <span className="font-bold text-primary">{inv.invoice_number}</span>
                          {isCurrent && <span className="current-badge">Editing</span>}
                        </div>
                        {getStatusBadge(inv.status)}
                      </div>

                      <div className="history-card-body">
                        <div className="history-client-cell">
                          <span className="font-semibold text-slate-800">{inv.client_name || 'No client specified'}</span>
                          {inv.client_description && (
                            <span className="history-client-sub">{inv.client_description}</span>
                          )}
                        </div>
                        <div className="history-card-total-box">
                          <span className="text-xs text-muted">Total</span>
                          <span className="font-bold text-primary text-base">
                            {formatCurrency(inv.total, inv.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="history-card-dates">
                        <span>Date: {inv.date || '-'}</span>
                        {inv.due_date && <span>Due: {inv.due_date}</span>}
                      </div>

                      <div className="history-card-actions">
                        <button
                          type="button"
                          className="btn-icon-action flex-1 justify-center"
                          onClick={() => handleSelectInvoice(inv)}
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action"
                          title="Duplicate as new invoice"
                          onClick={() => handleDuplicate(inv)}
                        >
                          <Copy size={14} />
                          <span>Copy</span>
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action text-danger"
                          title="Delete this invoice"
                          disabled={deletingId === inv.id}
                          onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        >
                          {deletingId === inv.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
