import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  PlusCircle, 
  Check, 
  Pin, 
  PenLine, 
  Download, 
  Loader2, 
  AlertCircle,
  User,
  LogOut,
  Cloud,
  CheckCircle2,
  History,
  Building2,
  LogIn
} from 'lucide-react';
import { toPng } from 'html-to-image';
import InvoiceEditor from './components/InvoiceEditor';
import InvoicePreview from './components/InvoicePreview';
import AuthModal from './components/AuthModal';
import CompanyProfileModal from './components/CompanyProfileModal';
import InvoiceHistoryModal from './components/InvoiceHistoryModal';
import { 
  supabase, 
  signOut, 
  fetchUserProfile, 
  saveInvoiceToDb 
} from './lib/supabaseClient';
import './App.css';

const DEFAULT_COMPANY = {
  companyName: 'Tech Solutions Inc.',
  companyDescription: 'Software Development Agency',
  contactNumber: '+1 (555) 019-2834',
  yourName: '+1 (555) 019-2834',
  companyAddress: '123 Innovation Dr\nSilicon Valley, CA 94025',
  companyEmail: 'billing@techsolutions.com',
};

function App() {
  const invoiceRef = useRef(null);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  // Supabase Auth & State
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Mode: 'fixed' (keep company name for all invoices) vs 'manual' (fill every time)
  const [companyMode, setCompanyMode] = useState(() => {
    return localStorage.getItem('invoice_company_mode') || 'fixed';
  });

  // Saved default company profile for 'fixed' mode (offline fallback)
  const [fixedCompany, setFixedCompany] = useState(() => {
    const saved = localStorage.getItem('invoice_fixed_company');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing fixed company profile:', e);
      }
    }
    return DEFAULT_COMPANY;
  });

  const [isCompanyLocked, setIsCompanyLocked] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3800);
  };

  const [invoiceData, setInvoiceData] = useState(() => {
    const savedDraft = localStorage.getItem('invoice_current_draft');
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft);
      } catch (e) {
        console.error('Error parsing draft:', e);
      }
    }

    const mode = localStorage.getItem('invoice_company_mode') || 'fixed';
    const isFixed = mode === 'fixed';

    let comp = DEFAULT_COMPANY;
    const savedComp = localStorage.getItem('invoice_fixed_company');
    if (savedComp) {
      try {
        comp = JSON.parse(savedComp);
      } catch {
        // Fallback to default company
      }
    }

    return {
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      companyName: isFixed ? comp.companyName : '',
      companyDescription: isFixed ? comp.companyDescription : '',
      contactNumber: isFixed ? (comp.contactNumber || comp.yourName || '') : '',
      yourName: isFixed ? (comp.contactNumber || comp.yourName || '') : '',
      companyAddress: isFixed ? comp.companyAddress : '',
      companyEmail: isFixed ? comp.companyEmail : '',
      clientName: 'Global Corp',
      clientDescription: 'Enterprise Solutions Provider',
      clientAddress: '456 Enterprise Way\nNew York, NY 10001',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        { description: 'Web Development Services', quantity: 40, price: 150, tax: 0 },
        { description: 'Server Setup', quantity: 1, price: 500, tax: 0 },
      ],
      currency: 'USD',
      status: 'draft',
      headerColor: '#1e293b',
      totalAmountColor: '#2563eb',
      notes: 'Please pay within 30 days via bank transfer.',
      showTaxColumn: true,
      discount: 0,
      discountType: 'percentage',
      amountPaid: 0,
      visibleFields: {
        invoiceNumber: true,
        companyName: true,
        companyDescription: true,
        companyAddress: true,
        companyEmail: true,
        clientName: true,
        clientDescription: true,
        clientAddress: true,
        date: true,
        dueDate: true,
        notes: true,
      }
    };
  });

  // Supabase Auth listener & initial session fetch
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId) => {
    try {
      const prof = await fetchUserProfile(userId);
      if (prof) {
        setUserProfile(prof);
        // If current invoice has blank company info or is default, auto-populate with user's company
        setInvoiceData(prev => {
          const isBlank = !prev.companyName || prev.companyName === DEFAULT_COMPANY.companyName;
          if (isBlank && prof.company_name) {
            return {
              ...prev,
              companyName: prof.company_name,
              companyDescription: prof.company_description || prev.companyDescription,
              contactNumber: prof.company_phone || prof.your_name || prev.contactNumber || '',
              yourName: prof.company_phone || prof.your_name || prev.yourName || '',
              companyAddress: prof.company_address || prev.companyAddress,
              companyEmail: prof.company_email || prev.companyEmail,
              currency: prof.default_currency || prev.currency || 'USD',
              notes: prof.default_notes || prev.notes,
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  // Save draft locally whenever invoiceData changes
  useEffect(() => {
    try {
      localStorage.setItem('invoice_current_draft', JSON.stringify(invoiceData));
      setHasUnsavedChanges(true);
    } catch (e) {
      console.error('Error saving draft:', e);
    }
  }, [invoiceData]);

  const handleModeChange = (newMode) => {
    setCompanyMode(newMode);
    localStorage.setItem('invoice_company_mode', newMode);

    if (newMode === 'fixed') {
      const compSource = userProfile ? {
        companyName: userProfile.company_name,
        companyDescription: userProfile.company_description,
        contactNumber: userProfile.company_phone || userProfile.your_name,
        yourName: userProfile.company_phone || userProfile.your_name,
        companyAddress: userProfile.company_address,
        companyEmail: userProfile.company_email,
      } : fixedCompany;

      if (!invoiceData.companyName && compSource.companyName) {
        setInvoiceData(prev => ({
          ...prev,
          companyName: compSource.companyName,
          companyDescription: compSource.companyDescription,
          contactNumber: compSource.contactNumber || compSource.yourName,
          yourName: compSource.yourName,
          companyAddress: compSource.companyAddress,
          companyEmail: compSource.companyEmail,
        }));
      }
      showToast('Switched to Fixed Mode. Company profile will be kept for all invoices.', 'info');
    } else {
      showToast('Switched to Fill Every Time mode. New invoices will start with blank company fields.', 'info');
    }
  };

  const handleSaveFixedCompany = () => {
    const profile = {
      companyName: invoiceData.companyName || '',
      companyDescription: invoiceData.companyDescription || '',
      contactNumber: invoiceData.contactNumber || invoiceData.yourName || '',
      yourName: invoiceData.contactNumber || invoiceData.yourName || '',
      companyAddress: invoiceData.companyAddress || '',
      companyEmail: invoiceData.companyEmail || '',
    };
    setFixedCompany(profile);
    localStorage.setItem('invoice_fixed_company', JSON.stringify(profile));
    showToast('Company profile fixed & saved as default for all future invoices!', 'success');
  };

  const handleRestoreFixedCompany = () => {
    const compSource = userProfile ? {
      companyName: userProfile.company_name,
      companyDescription: userProfile.company_description,
      contactNumber: userProfile.company_phone || userProfile.your_name,
      yourName: userProfile.company_phone || userProfile.your_name,
      companyAddress: userProfile.company_address,
      companyEmail: userProfile.company_email,
    } : fixedCompany;

    setInvoiceData(prev => ({
      ...prev,
      companyName: compSource.companyName || '',
      companyDescription: compSource.companyDescription || '',
      contactNumber: compSource.contactNumber || compSource.yourName || '',
      yourName: compSource.yourName || '',
      companyAddress: compSource.companyAddress || '',
      companyEmail: compSource.companyEmail || '',
    }));
    showToast('Restored saved company profile.', 'info');
  };

  const handleClearCompany = () => {
    setInvoiceData(prev => ({
      ...prev,
      companyName: '',
      companyDescription: '',
      contactNumber: '',
      yourName: '',
      companyAddress: '',
      companyEmail: '',
    }));
    showToast('Company details cleared for fresh entry.', 'info');
  };

  const handleNewInvoice = () => {
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newInvoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

    const compSource = userProfile ? {
      companyName: userProfile.company_name || '',
      companyDescription: userProfile.company_description || '',
      contactNumber: userProfile.company_phone || userProfile.your_name || '',
      yourName: userProfile.company_phone || userProfile.your_name || '',
      companyAddress: userProfile.company_address || '',
      companyEmail: userProfile.company_email || '',
      currency: userProfile.default_currency || 'USD',
      notes: userProfile.default_notes || 'Please pay within 30 days via bank transfer.',
    } : fixedCompany;

    setCurrentInvoiceId(null);

    if (companyMode === 'fixed' || userProfile) {
      setInvoiceData({
        invoiceNumber: newInvoiceNumber,
        companyName: compSource.companyName || '',
        companyDescription: compSource.companyDescription || '',
        contactNumber: compSource.contactNumber || compSource.yourName || '',
        yourName: compSource.yourName || '',
        companyAddress: compSource.companyAddress || '',
        companyEmail: compSource.companyEmail || '',
        clientName: '',
        clientDescription: '',
        clientAddress: '',
        date: today,
        dueDate: due,
        items: [{ description: '', quantity: 1, price: 0, tax: 0 }],
        currency: compSource.currency || 'USD',
        status: 'draft',
        headerColor: '#1e293b',
        totalAmountColor: '#2563eb',
        discount: 0,
        discountType: 'percentage',
        amountPaid: 0,
        notes: compSource.notes || 'Please pay within 30 days via bank transfer.',
        showTaxColumn: true,
        visibleFields: {
          invoiceNumber: true,
          companyName: true,
          companyDescription: true,
          companyAddress: true,
          companyEmail: true,
          clientName: true,
          clientDescription: true,
          clientAddress: true,
          date: true,
          dueDate: true,
          notes: true,
        }
      });
      setHasUnsavedChanges(false);
      showToast('New invoice created! Saved company profile automatically preserved.', 'success');
    } else {
      setInvoiceData({
        invoiceNumber: newInvoiceNumber,
        companyName: '',
        companyDescription: '',
        contactNumber: '',
        yourName: '',
        companyAddress: '',
        companyEmail: '',
        clientName: '',
        clientDescription: '',
        clientAddress: '',
        date: today,
        dueDate: due,
        items: [{ description: '', quantity: 1, price: 0, tax: 0 }],
        currency: 'USD',
        status: 'draft',
        headerColor: '#1e293b',
        totalAmountColor: '#2563eb',
        discount: 0,
        discountType: 'percentage',
        amountPaid: 0,
        notes: 'Please pay within 30 days via bank transfer.',
        showTaxColumn: true,
        visibleFields: {
          invoiceNumber: true,
          companyName: true,
          companyDescription: true,
          companyAddress: true,
          companyEmail: true,
          clientName: true,
          clientDescription: true,
          clientAddress: true,
          date: true,
          dueDate: true,
          notes: true,
        }
      });
      setHasUnsavedChanges(false);
      showToast('New invoice created! Ready for you to fill in details.', 'info');
    }
  };

  const handleSaveToCloud = async () => {
    if (!currentUser) {
      setAuthModalMode('signin');
      setIsAuthModalOpen(true);
      showToast('Please sign in or create an account to save invoices to your cloud history.', 'info');
      return;
    }

    setIsSavingToCloud(true);
    try {
      const saved = await saveInvoiceToDb(currentUser.id, invoiceData, currentInvoiceId);
      if (saved?.id) {
        setCurrentInvoiceId(saved.id);
      }
      setHasUnsavedChanges(false);
      showToast(`Invoice ${invoiceData.invoiceNumber} saved to your cloud account!`, 'success');
    } catch (err) {
      console.error('Error saving invoice to cloud:', err);
      showToast(err.message || 'Failed to save invoice. Ensure tables are created in Supabase.', 'danger');
    } finally {
      setIsSavingToCloud(false);
    }
  };

  const handleLoadInvoiceFromHistory = (inv) => {
    setInvoiceData({
      invoiceNumber: inv.invoice_number,
      companyName: inv.company_name || '',
      companyDescription: inv.company_description || '',
      contactNumber: inv.contact_number || inv.your_name || '',
      yourName: inv.contact_number || inv.your_name || '',
      companyAddress: inv.company_address || '',
      companyEmail: inv.company_email || '',
      clientName: inv.client_name || '',
      clientDescription: inv.client_description || '',
      clientAddress: inv.client_address || '',
      date: inv.date || new Date().toISOString().split('T')[0],
      dueDate: inv.due_date || new Date().toISOString().split('T')[0],
      items: inv.items || [{ description: '', quantity: 1, price: 0, tax: 0 }],
      currency: inv.currency || 'USD',
      status: inv.status || 'draft',
      headerColor: inv.header_color || '#1e293b',
      totalAmountColor: inv.total_amount_color || '#2563eb',
      notes: inv.notes || '',
      showTaxColumn: inv.show_tax_column ?? true,
      discount: inv.discount || 0,
      discountType: inv.discount_type || 'percentage',
      amountPaid: inv.amount_paid || 0,
      visibleFields: inv.visible_fields || {
        companyName: true,
        companyDescription: true,
        companyAddress: true,
        companyEmail: true,
        clientName: true,
        clientDescription: true,
        clientAddress: true,
        date: true,
        dueDate: true,
        notes: true,
      }
    });
    setCurrentInvoiceId(inv.id);
    setHasUnsavedChanges(false);
  };

  const handleApplyProfileToInvoice = (prof) => {
    setInvoiceData(prev => ({
      ...prev,
      companyName: prof.companyName || prev.companyName,
      companyDescription: prof.companyDescription || prev.companyDescription,
      contactNumber: prof.contactNumber || prof.companyPhone || prof.yourName || prev.contactNumber || '',
      yourName: prof.yourName || prof.contactNumber || prev.yourName || '',
      companyAddress: prof.companyAddress || prev.companyAddress,
      companyEmail: prof.companyEmail || prev.companyEmail,
      currency: prof.defaultCurrency || prev.currency,
      notes: prof.defaultNotes || prev.notes,
    }));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setCurrentUser(null);
      setUserProfile(null);
      setCurrentInvoiceId(null);
      showToast('Signed out successfully.', 'info');
    } catch (err) {
      console.error('Sign out error:', err);
      showToast('Error signing out.', 'danger');
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index][field] = value;
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const addItem = () => {
    setInvoiceData({
      ...invoiceData,
      items: [...invoiceData.items, { description: '', quantity: 1, price: 0, tax: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = invoiceData.items.filter((_, i) => i !== index);
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    // If on mobile/tablet and in editor tab, switch to preview tab so the invoice element is rendered
    if (activeTab === 'editor' && window.innerWidth < 1024) {
      setActiveTab('preview');
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    const element = invoiceRef.current || document.getElementById('invoice-page-element');
    if (!element) {
      showToast('Could not find invoice preview element to capture.', 'danger');
      return;
    }

    setIsDownloadingPng(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      let dataUrl;
      const options = {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          boxShadow: 'none',
          borderRadius: '0',
          margin: '0',
          transform: 'none',
          width: '794px',
          minWidth: '794px',
        },
      };

      try {
        dataUrl = await toPng(element, options);
      } catch (fontErr) {
        console.warn('Initial toPng failed, retrying with skipFonts...', fontErr);
        dataUrl = await toPng(element, { ...options, skipFonts: true });
      }

      const link = document.createElement('a');
      const safeInvoiceNumber = (invoiceData.invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Invoice-${safeInvoiceNumber}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Invoice PNG downloaded successfully!', 'success');
    } catch (error) {
      console.error('Failed to generate PNG:', error);
      showToast('Failed to download PNG. Please try again.', 'danger');
    } finally {
      setIsDownloadingPng(false);
    }
  };

  return (
    <div className="app-container">
      {/* Top Bar for User Account & Cloud Status */}
      <div className="header-top-row no-print">
        <div className="user-status-bar">
          {currentUser ? (
            <div className="user-pill" title={`Logged in as ${currentUser.email}`}>
              <div className="user-avatar-circle">
                {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="user-email-text">{currentUser.email}</span>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setAuthModalMode('signin');
                setIsAuthModalOpen(true);
              }}
            >
              <LogIn size={14} />
              <span>Sign In / Sign Up</span>
            </button>
          )}

          {/* Cloud Save status pill */}
          {currentUser ? (
            <div className={`cloud-status-indicator ${hasUnsavedChanges ? 'unsaved' : 'saved'}`}>
              {hasUnsavedChanges ? (
                <>
                  <Cloud size={12} />
                  <span>Unsaved Changes</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} />
                  <span>Cloud Synced</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-muted text-xs hidden sm:inline">
              Guest Mode (Save to Cloud requires free sign in)
            </span>
          )}
        </div>

        <div className="user-status-bar">
          {currentUser && (
            <>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsHistoryModalOpen(true)}
                title="View past invoices"
              >
                <History size={14} />
                <span>My Invoices</span>
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsProfileModalOpen(true)}
                title="Manage saved company details"
              >
                <Building2 size={14} />
                <span><span className="hidden sm:inline">Company </span>Settings</span>
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm text-muted"
                onClick={handleSignOut}
                title="Sign out of your account"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Header */}
      <header className="header no-print">
        <div className="header-brand">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            Invoice Maker Pro
          </h1>
          <p className="text-muted text-sm">
            {userProfile?.company_name 
              ? `Invoicing as ${userProfile.company_name}` 
              : 'Create, customize, and save beautiful invoices in seconds'}
          </p>
        </div>
        <div className="header-actions">
          {/* Cloud Save Button */}
          <button
            type="button"
            onClick={handleSaveToCloud}
            disabled={isSavingToCloud}
            className={`btn ${currentUser ? 'btn-primary' : 'btn-outline'}`}
            title="Save invoice to your cloud account"
          >
            {isSavingToCloud ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Cloud size={16} />
                <span>Save<span className="hidden sm:inline"> to Cloud</span></span>
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={handleNewInvoice} 
            className="btn btn-outline"
            title="Start a new invoice"
          >
            <PlusCircle size={16} />
            <span>+ New<span className="hidden sm:inline"> Invoice</span></span>
          </button>

          <button 
            type="button"
            onClick={handleDownloadPng} 
            disabled={isDownloadingPng}
            className="btn btn-secondary"
            title="Download invoice as high-resolution PNG image"
          >
            {isDownloadingPng ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span><span className="hidden sm:inline">Generating </span>PNG...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span><span className="hidden sm:inline">Download </span>PNG</span>
              </>
            )}
          </button>
          <button 
            type="button"
            onClick={handlePrint} 
            className="btn btn-primary"
            title="Print or save invoice as PDF"
          >
            <Printer size={16} />
            <span><span className="hidden sm:inline">Print / </span>PDF</span>
          </button>
        </div>
      </header>

      {/* Mobile View Switcher (< 1024px) */}
      <div className="mobile-view-tabs no-print">
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className={`mobile-view-tab ${activeTab === 'editor' ? 'active' : ''}`}
        >
          <PenLine size={16} /> Edit Invoice
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`mobile-view-tab ${activeTab === 'preview' ? 'active' : ''}`}
        >
          <Printer size={16} /> Live Preview
        </button>
      </div>

      <div className="invoice-layout">
        <div className={`editor-wrapper no-print ${activeTab === 'preview' ? 'tab-pane-hidden' : ''}`}>
          <InvoiceEditor
            invoiceData={invoiceData}
            setInvoiceData={setInvoiceData}
            handleItemChange={handleItemChange}
            addItem={addItem}
            removeItem={removeItem}
            companyMode={companyMode}
            onModeChange={handleModeChange}
            onSaveFixedCompany={handleSaveFixedCompany}
            isCompanyLocked={isCompanyLocked}
            setIsCompanyLocked={setIsCompanyLocked}
            onClearCompany={handleClearCompany}
            onRestoreFixedCompany={handleRestoreFixedCompany}
            onSwitchToPreview={() => setActiveTab('preview')}
            onOpenProfileSettings={() => setIsProfileModalOpen(true)}
            isUserLoggedIn={!!currentUser}
          />
        </div>

        <div className={`preview-wrapper ${activeTab === 'editor' ? 'tab-pane-hidden' : ''}`}>
          <InvoicePreview 
            invoiceData={invoiceData} 
            previewRef={invoiceRef}
            onDownloadPng={handleDownloadPng}
            onPrint={handlePrint}
            isDownloadingPng={isDownloadingPng}
            activeTab={activeTab}
          />
        </div>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={(user, message) => {
          setCurrentUser(user);
          loadProfile(user.id);
          showToast(message, 'success');
        }}
      />

      <CompanyProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        currentProfile={userProfile}
        onProfileUpdated={(updated) => {
          setUserProfile(updated);
        }}
        onApplyToInvoice={handleApplyProfileToInvoice}
        showToast={showToast}
      />

      <InvoiceHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        user={currentUser}
        onLoadInvoice={handleLoadInvoiceFromHistory}
        onNewInvoice={handleNewInvoice}
        onSaveCurrentInvoice={handleSaveToCloud}
        showToast={showToast}
        currentInvoiceId={currentInvoiceId}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="toast-container no-print">
          <div className={`toast toast-${toast.type || 'info'}`}>
            {toast.type === 'success' && <Check size={18} className="text-green-400" />}
            {toast.type === 'info' && <Pin size={18} className="text-blue-400" />}
            {toast.type === 'danger' && <AlertCircle size={18} className="text-red-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
