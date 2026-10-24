import React, { useState, useEffect, useRef } from 'react';
import { Printer, PlusCircle, Check, Pin, PenLine, Download, Loader2, AlertCircle } from 'lucide-react';
import { toPng } from 'html-to-image';
import InvoiceEditor from './components/InvoiceEditor';
import InvoicePreview from './components/InvoicePreview';
import './App.css';

const DEFAULT_COMPANY = {
  companyName: 'Tech Solutions Inc.',
  companyDescription: 'Software Development Agency',
  yourName: 'Alex Smith',
  companyAddress: '123 Innovation Dr\nSilicon Valley, CA 94025',
  companyEmail: 'billing@techsolutions.com',
};

function App() {
  const invoiceRef = useRef(null);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  // Mode: 'fixed' (keep company name for all invoices) vs 'manual' (fill every time)
  const [companyMode, setCompanyMode] = useState(() => {
    return localStorage.getItem('invoice_company_mode') || 'fixed';
  });

  // Saved default company profile for 'fixed' mode
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
    }, 3500);
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
      yourName: isFixed ? comp.yourName : '',
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
      headerColor: '#1e293b',
      totalAmountColor: '#2563eb',
      notes: 'Please pay within 30 days via bank transfer.',
      showTaxColumn: true,
      discount: 0,
      discountType: 'percentage',
      amountPaid: 0,
      visibleFields: {
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

  // Save draft whenever invoiceData changes
  useEffect(() => {
    try {
      localStorage.setItem('invoice_current_draft', JSON.stringify(invoiceData));
    } catch (e) {
      console.error('Error saving draft:', e);
    }
  }, [invoiceData]);

  const handleModeChange = (newMode) => {
    setCompanyMode(newMode);
    localStorage.setItem('invoice_company_mode', newMode);

    if (newMode === 'fixed') {
      if (!invoiceData.companyName && fixedCompany.companyName) {
        setInvoiceData(prev => ({
          ...prev,
          companyName: fixedCompany.companyName,
          companyDescription: fixedCompany.companyDescription,
          yourName: fixedCompany.yourName,
          companyAddress: fixedCompany.companyAddress,
          companyEmail: fixedCompany.companyEmail,
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
      yourName: invoiceData.yourName || '',
      companyAddress: invoiceData.companyAddress || '',
      companyEmail: invoiceData.companyEmail || '',
    };
    setFixedCompany(profile);
    localStorage.setItem('invoice_fixed_company', JSON.stringify(profile));
    showToast('Company profile fixed & saved as default for all future invoices!', 'success');
  };

  const handleRestoreFixedCompany = () => {
    setInvoiceData(prev => ({
      ...prev,
      companyName: fixedCompany.companyName || '',
      companyDescription: fixedCompany.companyDescription || '',
      yourName: fixedCompany.yourName || '',
      companyAddress: fixedCompany.companyAddress || '',
      companyEmail: fixedCompany.companyEmail || '',
    }));
    showToast('Restored saved fixed company profile.', 'info');
  };

  const handleClearCompany = () => {
    setInvoiceData(prev => ({
      ...prev,
      companyName: '',
      companyDescription: '',
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

    if (companyMode === 'fixed') {
      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: newInvoiceNumber,
        companyName: fixedCompany.companyName || '',
        companyDescription: fixedCompany.companyDescription || '',
        yourName: fixedCompany.yourName || '',
        companyAddress: fixedCompany.companyAddress || '',
        companyEmail: fixedCompany.companyEmail || '',
        clientName: '',
        clientDescription: '',
        clientAddress: '',
        date: today,
        dueDate: due,
        items: [{ description: '', quantity: 1, price: 0, tax: 0 }],
        discount: 0,
        amountPaid: 0,
        notes: 'Please pay within 30 days via bank transfer.',
      }));
      showToast('New invoice created! Fixed company profile preserved.', 'success');
    } else {
      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: newInvoiceNumber,
        companyName: '',
        companyDescription: '',
        yourName: '',
        companyAddress: '',
        companyEmail: '',
        clientName: '',
        clientDescription: '',
        clientAddress: '',
        date: today,
        dueDate: due,
        items: [{ description: '', quantity: 1, price: 0, tax: 0 }],
        discount: 0,
        amountPaid: 0,
        notes: 'Please pay within 30 days via bank transfer.',
      }));
      showToast('New invoice created! Ready for you to fill in company name.', 'info');
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
        pixelRatio: 2, // 2x resolution for sharp, professional PNG
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
      <header className="header no-print">
        <div className="header-brand">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            Invoice Maker Pro
          </h1>
          <p className="text-muted text-sm">Create beautiful invoices in seconds</p>
        </div>
        <div className="header-actions">
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

