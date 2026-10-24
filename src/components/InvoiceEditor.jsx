import React from 'react';
import { Plus, Trash2, Pin, PenLine, Save, Lock, Unlock, RotateCcw, Eye } from 'lucide-react';
import Input from './Input';

export default function InvoiceEditor({
    invoiceData,
    setInvoiceData,
    handleItemChange,
    addItem,
    removeItem,
    companyMode,
    onModeChange,
    onSaveFixedCompany,
    isCompanyLocked,
    setIsCompanyLocked,
    onClearCompany,
    onRestoreFixedCompany,
    onSwitchToPreview,
}) {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setInvoiceData(prev => ({ ...prev, [name]: value }));
    };

    const formatCurrency = (amount) => {
        const currency = invoiceData.currency || 'USD';
        const localeMap = {
            'USD': 'en-US',
            'INR': 'en-IN',
            'AED': 'en-AE',
        };
        const locale = localeMap[currency] || 'en-US';

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    const subtotal = invoiceData.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    let discountAmount = 0;
    if (invoiceData.discount > 0) {
        if (invoiceData.discountType === 'percentage') {
            discountAmount = subtotal * (invoiceData.discount / 100);
        } else {
            discountAmount = parseFloat(invoiceData.discount) || 0;
        }
    }
    const subtotalAfterDiscount = subtotal - discountAmount;
    let tax = 0;
    if (invoiceData.showTaxColumn) {
        tax = invoiceData.items.reduce((acc, item) => acc + (item.quantity * item.price * (item.tax || 0) / 100), 0);
    }
    const total = subtotalAfterDiscount + tax;
    const amountPaid = parseFloat(invoiceData.amountPaid) || 0;
    const balanceDue = total - amountPaid;

    return (
        <div className="card invoice-editor">
            <h2 className="text-2xl mb-6 font-bold text-primary">Edit Invoice</h2>

            <div className="section mb-8">
                <h3 className="text-lg mb-4 font-semibold text-muted">Invoice Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Currency</label>
                        <select
                            name="currency"
                            value={invoiceData.currency}
                            onChange={handleChange}
                            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="USD">Dollar (USD)</option>
                            <option value="INR">Rupee (INR)</option>
                            <option value="AED">Dirham (AED)</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Header Color</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="color"
                                name="headerColor"
                                value={invoiceData.headerColor || '#1e293b'}
                                onChange={handleChange}
                                className="h-10 w-16 p-1 border border-gray-300 rounded-md cursor-pointer"
                            />
                            <span className="text-sm text-gray-500 font-mono">{invoiceData.headerColor || '#1e293b'}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Total Amount Color</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="color"
                                name="totalAmountColor"
                                value={invoiceData.totalAmountColor || '#2563eb'}
                                onChange={handleChange}
                                className="h-10 w-16 p-1 border border-gray-300 rounded-md cursor-pointer"
                            />
                            <span className="text-sm text-gray-500 font-mono">{invoiceData.totalAmountColor || '#2563eb'}</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Show Tax Column</label>
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                name="showTaxColumn"
                                checked={invoiceData.showTaxColumn}
                                onChange={(e) => setInvoiceData(prev => ({ ...prev, showTaxColumn: e.target.checked }))}
                                className="w-5 h-5 cursor-pointer rounded text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-gray-700">Enable Tax per Item</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Discount</label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Input
                                    type="number"
                                    name="discount"
                                    value={invoiceData.discount}
                                    onChange={handleChange}
                                    placeholder="0"
                                />
                            </div>
                            <select
                                name="discountType"
                                value={invoiceData.discountType}
                                onChange={handleChange}
                                className="p-2 border border-gray-300 rounded-md focus:outline-none w-24"
                            >
                                <option value="percentage">%</option>
                                <option value="flat">Flat</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Amount Paid</label>
                        <div className="flex-1">
                            <Input
                                type="number"
                                name="amountPaid"
                                value={invoiceData.amountPaid}
                                onChange={handleChange}
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="section mb-8">
                <h3 className="text-lg mb-4 font-semibold text-muted">Field Visibility</h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {invoiceData.visibleFields && Object.keys(invoiceData.visibleFields).map(field => (
                        <div key={field} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200">
                            <input
                                type="checkbox"
                                checked={invoiceData.visibleFields[field]}
                                onChange={(e) => setInvoiceData(prev => ({
                                    ...prev,
                                    visibleFields: {
                                        ...prev.visibleFields,
                                        [field]: e.target.checked
                                    }
                                }))}
                                className="w-4 h-4 cursor-pointer text-primary rounded"
                            />
                            <span className="text-xs sm:text-sm text-gray-700 capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="section mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-muted">Company Details</h3>
                    {companyMode === 'fixed' ? (
                        <span className="badge badge-success text-xs">
                            <Pin size={12} /> Fixed Company Active
                        </span>
                    ) : (
                        <span className="badge badge-info text-xs">
                            <PenLine size={12} /> Fill Every Time Active
                        </span>
                    )}
                </div>

                {/* Company Mode Selector Card */}
                <div className="company-mode-card">
                    <div className="company-mode-header">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted">
                            Company Setup Option
                        </span>
                        {companyMode === 'fixed' && (
                            <button
                                type="button"
                                onClick={() => setIsCompanyLocked(!isCompanyLocked)}
                                className="btn btn-outline text-xs py-1 px-2.5 flex items-center gap-1.5"
                                title={isCompanyLocked ? "Unlock to edit company fields" : "Lock fields to prevent accidental edits"}
                            >
                                {isCompanyLocked ? <Lock size={13} className="text-amber-600" /> : <Unlock size={13} className="text-slate-500" />}
                                {isCompanyLocked ? 'Locked (Click to edit)' : 'Lock Details'}
                            </button>
                        )}
                    </div>

                    <div className="company-mode-tabs">
                        <button
                            type="button"
                            className={`company-mode-tab ${companyMode === 'fixed' ? 'active' : ''}`}
                            onClick={() => onModeChange('fixed')}
                        >
                            <Pin size={15} /> Fixed Company Name
                        </button>
                        <button
                            type="button"
                            className={`company-mode-tab ${companyMode === 'manual' ? 'active' : ''}`}
                            onClick={() => onModeChange('manual')}
                        >
                            <PenLine size={15} /> Fill Every Time
                        </button>
                    </div>

                    {companyMode === 'fixed' ? (
                        <div className="company-mode-body">
                            <p className="company-mode-description">
                                📌 <strong>Fixed Mode:</strong> Company name & details are saved permanently. New invoices automatically retain this company information.
                            </p>
                            <div className="company-mode-actions">
                                <button
                                    type="button"
                                    onClick={onSaveFixedCompany}
                                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                                >
                                    <Save size={14} /> Save as Fixed Default
                                </button>
                                <button
                                    type="button"
                                    onClick={onRestoreFixedCompany}
                                    className="btn btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                                    title="Reload saved default company info"
                                >
                                    <RotateCcw size={14} /> Restore Saved
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="company-mode-body">
                            <p className="company-mode-description">
                                ✍️ <strong>Fill Every Time:</strong> You fill company details fresh for every invoice. Starting a new invoice will clear company fields for manual entry.
                            </p>
                            <div className="company-mode-actions">
                                <button
                                    type="button"
                                    onClick={onClearCompany}
                                    className="btn btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 text-danger"
                                >
                                    <RotateCcw size={14} /> Clear Company Fields
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {isCompanyLocked && companyMode === 'fixed' && (
                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <Lock size={13} /> Company details are locked. Click Unlock to make changes.
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsCompanyLocked(false)}
                            className="font-semibold underline hover:text-amber-900 cursor-pointer"
                        >
                            Unlock
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input 
                        label="Company Name" 
                        name="companyName" 
                        value={invoiceData.companyName || ''} 
                        onChange={handleChange} 
                        placeholder="Your Company Name" 
                        disabled={companyMode === 'fixed' && isCompanyLocked}
                    />
                    <Input 
                        label="Tagline / Description" 
                        name="companyDescription" 
                        value={invoiceData.companyDescription || ''} 
                        onChange={handleChange} 
                        placeholder="e.g. Software Services" 
                        disabled={companyMode === 'fixed' && isCompanyLocked}
                    />
                    <Input 
                        label="Your Name" 
                        name="yourName" 
                        value={invoiceData.yourName || ''} 
                        onChange={handleChange} 
                        placeholder="John Doe" 
                        disabled={companyMode === 'fixed' && isCompanyLocked}
                    />
                    <Input 
                        label="Address" 
                        name="companyAddress" 
                        value={invoiceData.companyAddress || ''} 
                        onChange={handleChange} 
                        placeholder="123 Street" 
                        disabled={companyMode === 'fixed' && isCompanyLocked}
                    />
                    <Input 
                        label="Email" 
                        name="companyEmail" 
                        value={invoiceData.companyEmail || ''} 
                        onChange={handleChange} 
                        placeholder="you@example.com" 
                        disabled={companyMode === 'fixed' && isCompanyLocked}
                    />
                </div>
            </div>

            <div className="section mb-8">
                <h3 className="text-lg mb-4 font-semibold text-muted">Client Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Client Name" name="clientName" value={invoiceData.clientName} onChange={handleChange} placeholder="Client Company" />
                    <Input label="Client Description" name="clientDescription" value={invoiceData.clientDescription || ''} onChange={handleChange} placeholder="e.g. Design Agency" />
                    <Input label="Client Address" name="clientAddress" value={invoiceData.clientAddress} onChange={handleChange} placeholder="456 Avenue" />
                    <Input label="Invoice Date" name="date" type="date" value={invoiceData.date} onChange={handleChange} />
                    <Input label="Due Date" name="dueDate" type="date" value={invoiceData.dueDate} onChange={handleChange} />
                </div>
            </div>

            <div className="section mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-muted">Items</h3>
                    <button onClick={addItem} className="btn btn-outline text-sm">
                        <Plus size={16} /> Add Item
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    {invoiceData.items.map((item, index) => (
                        <div key={index} className="item-row-card">
                            <div className="item-row-header-mobile sm:hidden">
                                <span className="text-xs font-semibold text-slate-500">Item #{index + 1}</span>
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="btn btn-danger text-xs py-1 px-2.5 rounded-md flex items-center gap-1"
                                    title="Remove Item"
                                >
                                    <Trash2 size={13} /> Remove
                                </button>
                            </div>

                            <div className="grid grid-cols-12 gap-2 items-end">
                                <div className={invoiceData.showTaxColumn ? "col-span-12 sm:col-span-5" : "col-span-12 sm:col-span-6"}>
                                    <Input
                                        label="Description"
                                        placeholder="Item description"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-4 sm:col-span-2">
                                    <Input
                                        type="number"
                                        label="Qty"
                                        placeholder="Qty"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className={invoiceData.showTaxColumn ? "col-span-4 sm:col-span-2" : "col-span-8 sm:col-span-5"}>
                                    <Input
                                        type="number"
                                        label="Price"
                                        placeholder="Price"
                                        value={item.price}
                                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                {invoiceData.showTaxColumn && (
                                    <div className="col-span-4 sm:col-span-2">
                                        <Input
                                            type="number"
                                            label="Tax %"
                                            placeholder="Tax %"
                                            value={item.tax}
                                            onChange={(e) => handleItemChange(index, 'tax', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                )}
                                <div className="hidden sm:flex col-span-1 justify-center pb-1">
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="btn btn-danger p-2 rounded-md"
                                        title="Remove Item"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Live Invoice Summary Card */}
                <div className="editor-summary-card">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-slate-800 text-sm">Invoice Summary</span>
                        <span className="text-xs text-muted">Auto-calculated</span>
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-emerald-600">
                                <span>Discount {invoiceData.discountType === 'percentage' ? `(${invoiceData.discount}%)` : ''}</span>
                                <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        {invoiceData.showTaxColumn && tax > 0 && (
                            <div className="flex justify-between text-slate-600">
                                <span>Tax</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(tax)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                            <span className="font-bold text-slate-900 text-base">Total</span>
                            <span className="font-bold text-xl" style={{ color: invoiceData.totalAmountColor || '#2563eb' }}>
                                {formatCurrency(total)}
                            </span>
                        </div>
                        {amountPaid > 0 && (
                            <div className="flex justify-between text-slate-700 pt-1">
                                <span>Balance Due</span>
                                <span className="font-bold text-slate-900">{formatCurrency(balanceDue)}</span>
                            </div>
                        )}
                    </div>
                    {onSwitchToPreview && (
                        <div className="mt-3 pt-3 border-t border-slate-200 lg:hidden">
                            <button
                                type="button"
                                onClick={onSwitchToPreview}
                                className="btn btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                            >
                                <Eye size={15} /> Switch to Live A4 Preview
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="section">
                <h3 className="text-lg mb-4 font-semibold text-muted">Additional Notes</h3>
                <textarea
                    rows="3"
                    name="notes"
                    placeholder="Thank you for your business!"
                    value={invoiceData.notes}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                />
            </div>
        </div>
    );
}
